// rtc-relay: Minimal RTP→WebRTC relay using Pion.
// Accepts RTP packets from FFmpeg on UDP ports, relays directly to a WebRTC
// PeerConnection with zero intermediate buffering. Supports DataChannel for input.
// Sets playout-delay extension on every video packet to minimize browser jitter buffer.

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/pion/interceptor"
	"github.com/pion/interceptor/pkg/stats"
	"github.com/pion/rtp"
	"github.com/pion/webrtc/v4"
)

const playoutDelayURI = "http://www.webrtc.org/experiments/rtp-hdrext/playout-delay"

// Session holds the state for one streaming session.
type Session struct {
	mu         sync.Mutex
	id         string
	pc         *webrtc.PeerConnection
	videoTrack *webrtc.TrackLocalStaticRTP
	audioTrack *webrtc.TrackLocalStaticRTP
	videoConn  *net.UDPConn
	audioConn  *net.UDPConn
	videoPort  int
	audioPort  int
	// inputCallback is set once in createSession before the session is published
	// to the sessions map, so callers in other goroutines see a stable value.
	inputCallback func(msg string)
	done          chan struct{}
	// Playout delay extension ID negotiated via SDP
	playoutDelayID uint8
	// Tracks whether we've already emitted DISCONNECT for this session so the
	// server doesn't get duplicate stop events during state flapping.
	disconnectEmitted bool
}

var (
	sessions   = map[string]*Session{}
	sessionsMu sync.Mutex
	// Shared MediaEngine with playout-delay extension registered
	mediaEngine *webrtc.MediaEngine
)

func init() {
	mediaEngine = &webrtc.MediaEngine{}
	if err := mediaEngine.RegisterDefaultCodecs(); err != nil {
		log.Fatal("register codecs:", err)
	}
	// Register playout-delay extension so browser knows to honor it
	if err := mediaEngine.RegisterHeaderExtension(
		webrtc.RTPHeaderExtensionCapability{URI: playoutDelayURI},
		webrtc.RTPCodecTypeVideo,
	); err != nil {
		log.Fatal("register playout-delay:", err)
	}
}

func allocateUDP() (*net.UDPConn, int, error) {
	conn, err := net.ListenUDP("udp4", &net.UDPAddr{IP: net.IPv4(127, 0, 0, 1), Port: 0})
	if err != nil {
		return nil, 0, err
	}
	return conn, conn.LocalAddr().(*net.UDPAddr).Port, nil
}

// forwardVideoRTP reads RTP from UDP, adds playout-delay extension, writes to track.
func forwardVideoRTP(conn *net.UDPConn, track *webrtc.TrackLocalStaticRTP, done chan struct{}, extID uint8) {
	buf := make([]byte, 1500)
	for {
		select {
		case <-done:
			return
		default:
		}
		n, err := conn.Read(buf)
		if err != nil {
			return
		}

		// Parse RTP packet so we can add the playout-delay extension
		pkt := &rtp.Packet{}
		if err := pkt.Unmarshal(buf[:n]); err != nil {
			continue
		}

		// Set playout-delay: min=50ms, max=100ms
		// Format: 12-bit min + 12-bit max, units of 10ms
		// min=5 (force 50ms buffer minimum), max=10 (allow up to 100ms)
		// Encoding: min=5=000000000101, max=10=000000001010
		// Byte0=0x00, Byte1=0x50, Byte2=0x0A
		if extID > 0 {
			pkt.Header.SetExtension(extID, []byte{0x00, 0x50, 0x0A})
		}

		if err := track.WriteRTP(pkt); err != nil {
			return
		}
	}
}

// forwardAudioRTP reads RTP from UDP and writes directly to track (no extension needed).
func forwardAudioRTP(conn *net.UDPConn, track *webrtc.TrackLocalStaticRTP, done chan struct{}) {
	buf := make([]byte, 1500)
	for {
		select {
		case <-done:
			return
		default:
		}
		n, err := conn.Read(buf)
		if err != nil {
			return
		}
		if _, err := track.Write(buf[:n]); err != nil {
			return
		}
	}
}

func createSession(id string) (*Session, error) {
	sessionsMu.Lock()
	if _, exists := sessions[id]; exists {
		sessionsMu.Unlock()
		return nil, fmt.Errorf("session %q already exists", id)
	}
	sessionsMu.Unlock()

	videoConn, videoPort, err := allocateUDP()
	if err != nil {
		return nil, fmt.Errorf("video UDP: %w", err)
	}
	audioConn, audioPort, err := allocateUDP()
	if err != nil {
		videoConn.Close()
		return nil, fmt.Errorf("audio UDP: %w", err)
	}

	videoTrack, err := webrtc.NewTrackLocalStaticRTP(
		webrtc.RTPCodecCapability{MimeType: webrtc.MimeTypeVP8},
		"video", "stream",
	)
	if err != nil {
		videoConn.Close()
		audioConn.Close()
		return nil, err
	}

	audioTrack, err := webrtc.NewTrackLocalStaticRTP(
		webrtc.RTPCodecCapability{MimeType: webrtc.MimeTypeOpus},
		"audio", "stream",
	)
	if err != nil {
		videoConn.Close()
		audioConn.Close()
		return nil, err
	}

	s := &Session{
		id:         id,
		videoTrack: videoTrack,
		audioTrack: audioTrack,
		videoConn:  videoConn,
		audioConn:  audioConn,
		videoPort:  videoPort,
		audioPort:  audioPort,
		done:       make(chan struct{}),
	}

	// Input callback is established here, before the session becomes
	// discoverable via the sessions map. No readers exist yet, so no lock
	// needed, and later DataChannel callbacks see a consistent value.
	s.inputCallback = func(msg string) {
		fmt.Fprintf(os.Stderr, "INPUT:{\"session\":%q,\"input\":%s}\n", id, msg)
	}

	sessionsMu.Lock()
	// TOCTOU re-check — another createSession could have raced us.
	if _, exists := sessions[id]; exists {
		sessionsMu.Unlock()
		videoConn.Close()
		audioConn.Close()
		return nil, fmt.Errorf("session %q already exists", id)
	}
	sessions[id] = s
	sessionsMu.Unlock()

	// Audio forwarding starts immediately (no extension needed)
	go forwardAudioRTP(audioConn, audioTrack, s.done)
	// Video forwarding starts after offer (need extension ID from SDP negotiation)

	return s, nil
}

func handleOffer(s *Session, offerSDP string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Create API with our custom MediaEngine that has playout-delay registered
	i := &interceptor.Registry{}
	if statsFactory, err := stats.NewInterceptor(); err == nil {
		i.Add(statsFactory)
	} else {
		log.Printf("stats interceptor disabled: %v", err)
	}

	api := webrtc.NewAPI(
		webrtc.WithMediaEngine(mediaEngine),
		webrtc.WithInterceptorRegistry(i),
	)

	// LAN-only deployment: phone and PC are on the same network, so host
	// candidates always reach each other. Skipping STUN avoids a DNS lookup
	// and a round trip during ICE gathering.
	pc, err := api.NewPeerConnection(webrtc.Configuration{})
	if err != nil {
		return "", err
	}
	s.pc = pc

	if _, err := pc.AddTrack(s.videoTrack); err != nil {
		return "", err
	}
	if _, err := pc.AddTrack(s.audioTrack); err != nil {
		return "", err
	}

	pc.OnDataChannel(func(dc *webrtc.DataChannel) {
		log.Printf("DataChannel opened: %s", dc.Label())
		dc.OnMessage(func(msg webrtc.DataChannelMessage) {
			if s.inputCallback != nil {
				s.inputCallback(string(msg.Data))
			}
		})
	})

	pc.OnConnectionStateChange(func(state webrtc.PeerConnectionState) {
		log.Printf("[%s] PeerConnection state: %s", s.id, state)
		switch state {
		case webrtc.PeerConnectionStateDisconnected,
			webrtc.PeerConnectionStateFailed,
			webrtc.PeerConnectionStateClosed:
			s.mu.Lock()
			already := s.disconnectEmitted
			s.disconnectEmitted = true
			s.mu.Unlock()
			if !already {
				// Server parses this off stderr and runs full session cleanup
				// (FFmpeg, emulator, Xvfb). Relay-local teardown happens when
				// the server then calls /stop, which is idempotent.
				fmt.Fprintf(os.Stderr, "DISCONNECT:{\"session\":%q}\n", s.id)
			}
		}
	})

	err = pc.SetRemoteDescription(webrtc.SessionDescription{
		Type: webrtc.SDPTypeOffer,
		SDP:  offerSDP,
	})
	if err != nil {
		return "", err
	}

	answer, err := pc.CreateAnswer(nil)
	if err != nil {
		return "", err
	}

	gatherDone := webrtc.GatheringCompletePromise(pc)
	err = pc.SetLocalDescription(answer)
	if err != nil {
		return "", err
	}
	<-gatherDone

	// Find the negotiated extension ID for playout-delay from the answer SDP
	desc := pc.LocalDescription()
	s.playoutDelayID = findExtensionID(desc.SDP, playoutDelayURI)
	log.Printf("playout-delay extension ID: %d", s.playoutDelayID)

	// Now start video forwarding with the negotiated extension ID
	go forwardVideoRTP(s.videoConn, s.videoTrack, s.done, s.playoutDelayID)

	return desc.SDP, nil
}

// findExtensionID parses SDP to find the extension ID for a given URI.
// Line shape: "a=extmap:N uri" or "a=extmap:N/sendrecv uri".
// Returns 0 when the extension isn't present; callers treat 0 as "disabled"
// (see forwardVideoRTP's `if extID > 0` guard around SetExtension). The RTP
// spec lets real extension IDs start at 1, so 0 is safe as a sentinel.
func findExtensionID(sdp string, uri string) uint8 {
	for _, line := range strings.Split(sdp, "\n") {
		line = strings.TrimRight(line, "\r")
		rest, ok := strings.CutPrefix(line, "a=extmap:")
		if !ok {
			continue
		}
		idStr, extURI, ok := strings.Cut(rest, " ")
		if !ok {
			continue
		}
		if slash := strings.IndexByte(idStr, '/'); slash >= 0 {
			idStr = idStr[:slash]
		}
		if extURI != uri {
			continue
		}
		if id, err := strconv.Atoi(idStr); err == nil {
			return uint8(id)
		}
	}
	return 0
}

func stopSession(id string) {
	sessionsMu.Lock()
	s, ok := sessions[id]
	if ok {
		delete(sessions, id)
	}
	sessionsMu.Unlock()

	if !ok {
		return
	}

	// Mark as disconnected before closing the PC so the state-change callback
	// suppresses its own DISCONNECT: emit. Without this, user-initiated stops
	// race their own server with a concurrent session.stop() via the disconnect
	// handler, which can trample cleanupTempDir before hasSaveChanged runs.
	s.mu.Lock()
	s.disconnectEmitted = true
	pc := s.pc
	s.mu.Unlock()

	close(s.done)
	s.videoConn.Close()
	s.audioConn.Close()
	if pc != nil {
		pc.Close()
	}
}

func main() {
	port := "9090"
	if len(os.Args) > 1 {
		port = os.Args[1]
	}

	mux := http.NewServeMux()

	mux.HandleFunc("POST /session", func(w http.ResponseWriter, r *http.Request) {
		var req struct{ ID string `json:"id"` }
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}

		s, err := createSession(req.ID)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]int{
			"videoPort": s.videoPort,
			"audioPort": s.audioPort,
		})
	})

	mux.HandleFunc("POST /offer", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			ID  string `json:"id"`
			SDP string `json:"sdp"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}

		sessionsMu.Lock()
		s, ok := sessions[req.ID]
		sessionsMu.Unlock()
		if !ok {
			http.Error(w, "session not found", 404)
			return
		}

		answerSDP, err := handleOffer(s, req.SDP)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"sdp": answerSDP})
	})

	mux.HandleFunc("POST /stop", func(w http.ResponseWriter, r *http.Request) {
		var req struct{ ID string `json:"id"` }
		json.NewDecoder(r.Body).Decode(&req)
		stopSession(req.ID)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"ok": true})
	})

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		io.WriteString(w, "ok")
	})

	srv := &http.Server{Addr: ":" + port, Handler: mux}

	// On SIGINT/SIGTERM (usually from the parent server's gracefulKill),
	// drain in-flight HTTP requests and close every PeerConnection so the
	// browser gets a clean end rather than a mid-packet TCP reset.
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		log.Println("rtc-relay: shutting down")
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		if err := srv.Shutdown(ctx); err != nil {
			log.Printf("http shutdown: %v", err)
		}
		sessionsMu.Lock()
		ids := make([]string, 0, len(sessions))
		for id := range sessions {
			ids = append(ids, id)
		}
		sessionsMu.Unlock()
		for _, id := range ids {
			stopSession(id)
		}
	}()

	log.Printf("rtc-relay listening on :%s", port)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
