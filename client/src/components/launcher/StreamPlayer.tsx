import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '@/api/client';
import { useStreamConnection } from '@/hooks/useStreamConnection';
import { useInputMapping } from '@/hooks/useInputMapping';
import TouchControls from './TouchControls';
import type { SystemType } from './TouchControls';

const TOUCH_CONFIGS = {
  '3ds': {
    streamW: 400, streamH: 480,
    bottomX: 40, bottomY: 240,
    bottomW: 320, bottomH: 240,
  },
  nds: {
    streamW: 256, streamH: 384,
    bottomX: 0, bottomY: 192,
    bottomW: 256, bottomH: 192,
  },
} as const;

type TouchSystem = keyof typeof TOUCH_CONFIGS;

function isTouchSystem(system: string): system is TouchSystem {
  return system in TOUCH_CONFIGS;
}

/**
 * Convert a client-space coordinate (from a touch/click on the video element)
 * to bottom-screen coordinates for the given system.
 *
 * Returns null if the tap is outside the bottom screen region.
 * Accounts for object-fit:contain letterboxing.
 */
function clientToBottomScreen(
  clientX: number,
  clientY: number,
  videoEl: HTMLVideoElement,
  system: TouchSystem,
): { x: number; y: number } | null {
  const cfg = TOUCH_CONFIGS[system];
  const rect = videoEl.getBoundingClientRect();
  const relX = clientX - rect.left;
  const relY = clientY - rect.top;

  // Calculate rendered video position within the element (object-fit: contain)
  const elemAR = rect.width / rect.height;
  const videoAR = cfg.streamW / cfg.streamH;

  let renderW: number, renderH: number, offsetX: number, offsetY: number;
  if (elemAR > videoAR) {
    // Element wider than video — pillarboxed (black bars on sides)
    renderH = rect.height;
    renderW = rect.height * videoAR;
    offsetX = (rect.width - renderW) / 2;
    offsetY = 0;
  } else {
    // Element taller than video — letterboxed (black bars top/bottom)
    renderW = rect.width;
    renderH = rect.width / videoAR;
    offsetX = 0;
    offsetY = (rect.height - renderH) / 2;
  }

  // Convert element-space → video-space
  const vx = ((relX - offsetX) / renderW) * cfg.streamW;
  const vy = ((relY - offsetY) / renderH) * cfg.streamH;

  // Check if tap falls within the bottom screen region
  if (vx < cfg.bottomX || vx >= cfg.bottomX + cfg.bottomW) return null;
  if (vy < cfg.bottomY || vy >= cfg.bottomY + cfg.bottomH) return null;

  return {
    x: vx - cfg.bottomX,
    y: vy - cfg.bottomY,
  };
}

interface StreamPlayerProps {
  savePath?: string;
  game: string;
  system: 'gb' | 'gbc' | 'gba' | 'nds' | '3ds';
  /** If provided, join an existing session instead of creating a new one */
  sessionId?: string;
  onClose: (result: { saveChanged: boolean; sessionId: string }) => void;
}

export function StreamPlayer({ savePath, game, system, sessionId: existingSessionId, onClose }: StreamPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const [stopping, setStopping] = useState(false);

  const { status, stream, start, stop, sendInput, getStats } = useStreamConnection();
  const { handleTouchInput } = useInputMapping(sendInput, status === 'connected');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  // Poll WebRTC stats for jitter buffer latency
  useEffect(() => {
    if (status !== 'connected') return;
    const interval = setInterval(async () => {
      const stats = await getStats();
      if (stats?.avgJitterBufferMs !== undefined) {
        setLatencyMs(stats.avgJitterBufferMs);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [status, getStats]);

  // On mount: start or join a stream session, then begin WebRTC connection
  useEffect(() => {
    // Guard against React StrictMode double-mount
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (existingSessionId) {
      // Join an existing session (mobile remote display)
      sessionIdRef.current = existingSessionId;
      start(existingSessionId);
    } else {
      // Create a new session (desktop-initiated)
      api.stream.start(savePath, game).then(({ sessionId }) => {
        sessionIdRef.current = sessionId;
        start(sessionId);
      }).catch((err) => {
        console.error('Failed to start stream session:', err);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach stream to video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream ?? null;
  }, [stream]);

  const handleStop = useCallback(async () => {
    if (stopping) return;
    setStopping(true);
    const sessionId = sessionIdRef.current ?? '';
    let saveChanged = false;
    if (!existingSessionId) {
      // Desktop-initiated: stop the server session and check save status
      try {
        const result = await api.stream.stop(sessionId);
        saveChanged = result.saveChanged;
      } catch { /* proceed */ }
    }
    // Always close the WebRTC connection
    await stop();
    onClose({ saveChanged, sessionId });
  }, [stopping, stop, onClose, existingSessionId]);

  const handleFullscreen = useCallback(() => {
    // Fullscreen the whole container so touch controls are included
    containerRef.current?.requestFullscreen().catch(() => {});
  }, []);

  const handleReset = useCallback(() => {
    sendInput({ action: 'reset' });
  }, [sendInput]);

  const handleSpeed = useCallback((multiplier: number) => {
    // 0 = unbound (hold Shift+Tab), 3 = toggle fast-forward, 1 = normal
    sendInput({ action: 'speed', multiplier });
  }, [sendInput]);

  const handleAnalogModifier = useCallback((active: boolean) => {
    sendInput({ action: 'analog_modifier', active });
  }, [sendInput]);

  // 3DS bottom-screen touch — proper lifecycle: start→move→end
  const lastTouchMoveRef = useRef(0);

  const sendTouch = useCallback((clientX: number, clientY: number, phase: 'start' | 'move' | 'end') => {
    const video = videoRef.current;
    if (!video || !isTouchSystem(system)) return false;

    const coords = clientToBottomScreen(clientX, clientY, video, system);
    if (!coords) return false;

    // Throttle moves to ~60/s max to avoid flooding xdotool
    if (phase === 'move') {
      const now = Date.now();
      if (now - lastTouchMoveRef.current < 16) return true; // consumed but throttled
      lastTouchMoveRef.current = now;
    }

    sendInput({ action: 'touch', x: coords.x, y: coords.y, phase });
    return true;
  }, [system, sendInput]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isTouchSystem(system)) return;
    const t = e.touches[0];
    if (sendTouch(t.clientX, t.clientY, 'start')) {
      e.preventDefault();
      e.stopPropagation();
      navigator.vibrate?.(5);
    }
  }, [system, sendTouch]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isTouchSystem(system)) return;
    const t = e.touches[0];
    if (sendTouch(t.clientX, t.clientY, 'move')) {
      e.preventDefault();
    }
  }, [system, sendTouch]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isTouchSystem(system)) return;
    // Send end with last known position (touch is gone so use changedTouches)
    const t = e.changedTouches[0];
    sendTouch(t.clientX, t.clientY, 'end');
  }, [system, sendTouch]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!isTouchSystem(system)) return;
    const video = videoRef.current;
    if (!video) return;
    const coords = clientToBottomScreen(e.clientX, e.clientY, video, system);
    if (coords) {
      e.preventDefault();
      // Quick tap: start + end
      sendInput({ action: 'touch', x: coords.x, y: coords.y, phase: 'start' });
      setTimeout(() => sendInput({ action: 'touch', x: coords.x, y: coords.y, phase: 'end' }), 50);
    }
  }, [system, sendInput]);

  const statusColor =
    status === 'connected' ? 'bg-green-500' :
    status === 'connecting' ? 'bg-yellow-500' :
    status === 'reconnecting' ? 'bg-orange-500' :
    status === 'disconnected' ? 'bg-red-500' : 'bg-gray-500';

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-black flex flex-col select-none" style={{ touchAction: 'none', WebkitUserSelect: 'none' }}>
      {/* Minimal header — just status + stop */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-black/80 shrink-0">
        <span className={`w-2 h-2 rounded-full ${statusColor}`} />
        <span className="text-sm text-white/50 flex-1 truncate">
          {game} {latencyMs !== null && <span className="text-white/30">{latencyMs}ms</span>}
        </span>
        <button
          onClick={handleFullscreen}
          className="text-sm text-white/40 px-2 py-0.5"
        >
          ⛶
        </button>
        <button
          onClick={handleStop}
          disabled={stopping}
          className="text-sm text-red-400 px-2 py-0.5"
        >
          {stopping ? '...' : 'Stop'}
        </button>
      </div>

      {/* Video + controls area */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        {/* Video takes remaining space above controls */}
        <div className="stream-video-wrapper relative flex-1 min-h-0">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={false}
            onContextMenu={(e) => e.preventDefault()}
            className="absolute inset-0 w-full h-full object-contain select-none"
            style={{ imageRendering: 'pixelated', touchAction: 'none' }}
          />

          {/* Bottom-screen touch capture — transparent overlay that detects
              taps/drags on the video and maps them to bottom-screen coordinates.
              Sits above video (z-5) but below TouchControls (z-10). */}
          {isTouchSystem(system) && (
            <div
              className="absolute inset-0 z-[5]"
              style={{ touchAction: 'none' }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={handleClick}
            />
          )}

          {/* Disconnected overlay */}
          {status === 'disconnected' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
              <p className="text-red-400 text-sm">Disconnected</p>
              <button
                onClick={() => sessionIdRef.current && start(sessionIdRef.current)}
                className="text-sm text-white bg-white/20 px-4 py-1.5 rounded-lg"
              >
                Reconnect
              </button>
            </div>
          )}
        </div>

        {/* Touch controls overlay the full area but controls anchor to bottom */}
        <TouchControls
          system={system as SystemType}
          onInput={handleTouchInput}
          onReset={handleReset}
          onSpeed={handleSpeed}
          onAnalogModifier={handleAnalogModifier}
        />

        {/* In portrait, reserve space so video doesn't overlap controls.
            In landscape, controls overlay and video fills height. */}
        <style>{`
          @media (orientation: portrait) {
            .stream-video-wrapper { margin-bottom: 10rem; }
          }
        `}</style>
      </div>
    </div>
  );
}
