import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '@/api/client';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

interface UseStreamConnectionReturn {
  status: ConnectionStatus;
  stream: MediaStream | null;
  start: (sessionId: string) => Promise<void>;
  stop: () => Promise<void>;
  sendInput: (data: Record<string, unknown>) => void;
}

export function useStreamConnection(): UseStreamConnectionReturn {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    sessionIdRef.current = null;
    setStream(null);
  }, []);

  const start = useCallback(async (sessionId: string) => {
    try {
      cleanup();
      setStatus('connecting');
      sessionIdRef.current = sessionId;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;

      const remoteStream = new MediaStream();
      setStream(remoteStream);

      pc.ontrack = (event) => {
        remoteStream.addTrack(event.track);
        // Minimize jitter buffer for lowest latency
        try {
          const receiver = event.receiver;
          if (receiver && 'jitterBufferTarget' in receiver) {
            (receiver as any).jitterBufferTarget = 0;
          }
        } catch {}
      };

      pc.onconnectionstatechange = () => {
        switch (pc.connectionState) {
          case 'connected':
            setStatus('connected');
            break;
          case 'disconnected':
          case 'failed':
            setStatus('reconnecting');
            break;
          case 'closed':
            setStatus('disconnected');
            break;
        }
      };

      // Receive video + audio
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      // DataChannel for input
      const dc = pc.createDataChannel('input');
      dcRef.current = dc;

      // Create offer with all ICE candidates gathered
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const completeSdp = await new Promise<string>((resolve) => {
        if (pc.iceGatheringState === 'complete') {
          resolve(pc.localDescription!.sdp);
          return;
        }
        const timeout = setTimeout(() => {
          resolve(pc.localDescription!.sdp);
        }, 5000);
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') {
            clearTimeout(timeout);
            resolve(pc.localDescription!.sdp);
          }
        };
      });

      // Exchange SDP with relay via Express
      const { sdp: answerSdp } = await api.stream.offer(sessionId, completeSdp);
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerSdp }));
    } catch (err) {
      console.error('[stream] Connection failed:', err);
      setStatus('disconnected');
    }
  }, [cleanup]);

  const stop = useCallback(async () => {
    // Only does WebRTC cleanup — the caller (StreamPlayer.handleStop)
    // handles the server-side api.stream.stop() call to get saveChanged.
    cleanup();
    setStatus('idle');
  }, [cleanup]);

  const sendInput = useCallback((data: Record<string, unknown>) => {
    const dc = dcRef.current;
    // console.log('[sendInput]', data, 'dc?', !!dc, 'state:', dc?.readyState);
    if (dc && dc.readyState === 'open') {
      dc.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    return () => {
      pcRef.current?.close();
      dcRef.current?.close();
    };
  }, []);

  // Expose pc for diagnostics
  const getStats = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return null;
    const stats = await pc.getStats();
    const result: Record<string, any> = {};
    stats.forEach((report) => {
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        result.jitterBufferDelay = report.jitterBufferDelay;
        result.jitterBufferEmittedCount = report.jitterBufferEmittedCount;
        result.framesDecoded = report.framesDecoded;
        result.framesDropped = report.framesDropped;
        result.framesReceived = report.framesReceived;
        result.packetsLost = report.packetsLost;
        result.jitter = report.jitter;
        // Calculate average jitter buffer delay in ms
        if (report.jitterBufferDelay && report.jitterBufferEmittedCount) {
          result.avgJitterBufferMs = Math.round(
            (report.jitterBufferDelay / report.jitterBufferEmittedCount) * 1000
          );
        }
      }
    });
    return result;
  }, []);

  return { status, stream, start, stop, sendInput, getStats };
}
