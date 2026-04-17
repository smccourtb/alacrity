// rtc-relay: Minimal RTP→WebRTC relay using Pion.
// Accepts RTP packets from FFmpeg on UDP ports, relays directly to a WebRTC
// PeerConnection with zero intermediate buffering. Supports DataChannel for input.
// Sets playout-delay extension on every video packet to minimize browser jitter buffer.

package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"sync"

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

	config := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{URLs: []string{"stun:stun.l.google.com:19302"}},
		},
	}
	pc, err := api.NewPeerConnection(config)
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
func findExtensionID(sdp string, uri string) uint8 {
	// Simple SDP parser: look for "a=extmap:N uri"
	lines := splitLines(sdp)
	for _, line := range lines {
		if len(line) > 10 && line[:9] == "a=extmap:" {
			rest := line[9:]
			// Format: "N uri" or "N/direction uri"
			spaceIdx := -1
			for i, c := range rest {
				if c == ' ' {
					spaceIdx = i
					break
				}
			}
			if spaceIdx < 0 {
				continue
			}
			idStr := rest[:spaceIdx]
			// Handle "N/sendrecv" format
			for i, c := range idStr {
				if c == '/' {
					idStr = idStr[:i]
					break
				}
			}
			extURI := rest[spaceIdx+1:]
			if extURI == uri {
				id, err := strconv.Atoi(idStr)
				if err == nil {
					return uint8(id)
				}
			}
		}
	}
	return 0
}

func splitLines(s string) []string {
	var lines []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '\n' {
			line := s[start:i]
			if len(line) > 0 && line[len(line)-1] == '\r' {
				line = line[:len(line)-1]
			}
			lines = append(lines, line)
			start = i + 1
		}
	}
	if start < len(s) {
		lines = append(lines, s[start:])
	}
	return lines
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

	close(s.done)
	s.videoConn.Close()
	s.audioConn.Close()
	if s.pc != nil {
		s.pc.Close()
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

	log.Printf("rtc-relay listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}
