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

	// Diagnostic counters — observed via GET /stats. Updated from the forward
	// goroutines (single writer each), read from the HTTP handler; atomic
	// int64 would be cleaner if we care, but this is diagnostic-only.
	videoPacketsIn   uint64
	videoPacketsOut  uint64
	videoParseErrs   uint64
	videoWriteErrs   uint64
	videoFirstPT     uint8
	videoCodecInfo   string
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

// forwardVideoRTP reads RTP from UDP, parses to rtp.Packet, optionally
// sets the playout-delay extension, and writes via track.WriteRTP so Pion
// rewrites the PT to match the SDP-negotiated value. track.Write (used
// for audio) doesn't rewrite PT; video has to go through WriteRTP or
// Safari drops everything when its negotiated VP8 PT differs from the
// PT mgba-stream hardcoded (96).
func forwardVideoRTP(s *Session) {
	buf := make([]byte, 1500)
	pkt := &rtp.Packet{}
	for {
		select {
		case <-s.done:
			return
		default:
		}
		n, err := s.videoConn.Read(buf)
		if err != nil {
			return
		}
		s.mu.Lock()
		s.videoPacketsIn++
		s.mu.Unlock()

		if err := pkt.Unmarshal(buf[:n]); err != nil {
			s.mu.Lock()
			s.videoParseErrs++
			s.mu.Unlock()
			continue
		}

		if s.playoutDelayID > 0 {
			pkt.Header.SetExtension(s.playoutDelayID, []byte{0x00, 0x50, 0x0A})
		}

		if err := s.videoTrack.WriteRTP(pkt); err != nil {
			s.mu.Lock()
			s.videoWriteErrs++
			s.mu.Unlock()
			continue
		}
		s.mu.Lock()
		if s.videoPacketsOut == 0 {
			s.videoFirstPT = pkt.Header.PayloadType
		}
		s.videoPacketsOut++
		s.mu.Unlock()
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
	log.Printf("[%s] playout-delay extID=%d", s.id, s.playoutDelayID)

	// Capture negotiated codecs for the /stats endpoint. If VP8 has no matching
	// PT, that explains audio-works-but-video-doesn't.
	var codecInfo []string
	for _, t := range pc.GetTransceivers() {
		sender := t.Sender()
		if sender == nil {
			continue
		}
		track := sender.Track()
		if track == nil {
			continue
		}
		params := sender.GetParameters()
		var codecs []string
		for _, c := range params.Codecs {
			codecs = append(codecs, fmt.Sprintf("%s/%d(PT=%d)", c.MimeType, c.ClockRate, c.PayloadType))
		}
		codecInfo = append(codecInfo, fmt.Sprintf("%s=[%s]", track.Kind(), strings.Join(codecs, ",")))
	}
	s.videoCodecInfo = strings.Join(codecInfo, " | ")

	go forwardVideoRTP(s)

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

	mux.HandleFunc("GET /stats", func(w http.ResponseWriter, r *http.Request) {
		sessionsMu.Lock()
		out := make(map[string]map[string]any, len(sessions))
		for id, s := range sessions {
			s.mu.Lock()
			info := map[string]any{
				"videoPacketsIn":  s.videoPacketsIn,
				"videoPacketsOut": s.videoPacketsOut,
				"videoParseErrs":  s.videoParseErrs,
				"videoWriteErrs":  s.videoWriteErrs,
				"videoFirstPT":    s.videoFirstPT,
				"playoutDelayID":  s.playoutDelayID,
				"codecInfo":       s.videoCodecInfo,
				"pcAttached":      s.pc != nil,
			}
			pc := s.pc
			s.mu.Unlock()

			if pc != nil {
				var senders []map[string]any
				for _, t := range pc.GetTransceivers() {
					sender := t.Sender()
					if sender == nil {
						continue
					}
					track := sender.Track()
					if track == nil {
						continue
					}
					params := sender.GetParameters()
					var ssrcs []uint32
					for _, enc := range params.Encodings {
						ssrcs = append(ssrcs, uint32(enc.SSRC))
					}
					senders = append(senders, map[string]any{
						"kind":  track.Kind().String(),
						"id":    track.ID(),
						"ssrcs": ssrcs,
					})
				}
				info["senders"] = senders
				info["iceState"] = pc.ICEConnectionState().String()
				info["pcState"] = pc.ConnectionState().String()

				// Pion's WebRTC-style stats — includes outbound-rtp entries per
				// track with packetsSent, bytesSent, nackCount, etc. That's
				// what'll tell us whether SRTP is actually emitting bytes for
				// the video sender or whether it's being dropped internally.
				info["rtcStats"] = pc.GetStats()
			}
			out[id] = info
		}
		sessionsMu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(out)
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
