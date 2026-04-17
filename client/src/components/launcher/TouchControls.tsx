import { useState, useCallback, useRef } from 'react';

export type SystemType = 'gb' | 'gbc' | 'gba' | 'nds' | '3ds';
export type GameButton =
  | 'up' | 'down' | 'left' | 'right'
  | 'stick_up' | 'stick_down' | 'stick_left' | 'stick_right'
  | 'a' | 'b' | 'x' | 'y'
  | 'l' | 'r' | 'zl' | 'zr'
  | 'start' | 'select';

interface TouchControlsProps {
  system: SystemType;
  onInput: (button: GameButton, type: 'down' | 'up') => void;
  onReset: () => void;
  onSpeed: (multiplier: number) => void;
  onAnalogModifier?: (active: boolean) => void;
}

// 1x = normal, 3x = 3 emulation frames per visual frame, MAX = uncapped
const SPEED_LABELS = ['1x', '3x', 'MAX'] as const;
const SPEED_CYCLE = [1, 3, 0] as const; // 0 = unbound

// Only render on touch devices
const isTouchDevice =
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

function useButtonHandlers(
  button: GameButton,
  onInput: TouchControlsProps['onInput'],
  haptic = false,
) {
  const handleStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (haptic) navigator.vibrate?.(10);
      onInput(button, 'down');
    },
    [button, haptic, onInput],
  );
  const handleEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      onInput(button, 'up');
    },
    [button, onInput],
  );
  return { onTouchStart: handleStart, onTouchEnd: handleEnd, onTouchCancel: handleEnd };
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────────

const baseBtn =
  'touch-none select-none flex items-center justify-center rounded-full font-bold text-white bg-white/20 active:bg-white/40';

interface DirButtonProps {
  button: GameButton;
  label: string;
  onInput: TouchControlsProps['onInput'];
  className?: string;
}

function DirButton({ button, label, onInput, className = '' }: DirButtonProps) {
  const handlers = useButtonHandlers(button, onInput);
  return (
    <button
      {...handlers}
      className={`${baseBtn} ${className}`}
      aria-label={label}
    >
      {label}
    </button>
  );
}

function DPad({ onInput }: { onInput: TouchControlsProps['onInput'] }) {
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-1 w-28 h-28">
      {/* Row 1 */}
      <div />
      <DirButton button="up" label="▲" onInput={onInput} className="w-8 h-8 text-xs" />
      <div />
      {/* Row 2 */}
      <DirButton button="left" label="◀" onInput={onInput} className="w-8 h-8 text-xs" />
      <div className="w-8 h-8 rounded-full bg-white/10" />
      <DirButton button="right" label="▶" onInput={onInput} className="w-8 h-8 text-xs" />
      {/* Row 3 */}
      <div />
      <DirButton button="down" label="▼" onInput={onInput} className="w-8 h-8 text-xs" />
      <div />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Virtual joystick — 8-way directional input via touch drag
// ──────────────────────────────────────────────────────────────────────────────

type StickDirection = 'stick_up' | 'stick_down' | 'stick_left' | 'stick_right';

/** Map an angle (radians from center) to active stick direction keys. */
function angleToDirections(angle: number): StickDirection[] {
  // Normalize to 0–2π
  const a = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const deg = (a * 180) / Math.PI;

  // 8 sectors of 45° each, centered on cardinal/diagonal directions
  if (deg >= 337.5 || deg < 22.5) return ['stick_right'];
  if (deg >= 22.5 && deg < 67.5) return ['stick_down', 'stick_right'];
  if (deg >= 67.5 && deg < 112.5) return ['stick_down'];
  if (deg >= 112.5 && deg < 157.5) return ['stick_down', 'stick_left'];
  if (deg >= 157.5 && deg < 202.5) return ['stick_left'];
  if (deg >= 202.5 && deg < 247.5) return ['stick_up', 'stick_left'];
  if (deg >= 247.5 && deg < 292.5) return ['stick_up'];
  return ['stick_up', 'stick_right']; // 292.5–337.5
}

const DEADZONE = 10;    // px from center before registering input
const RUN_THRESHOLD = 0.6; // fraction of radius — above = hold B to sprint

function Joystick({ onInput }: {
  onInput: TouchControlsProps['onInput'];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<Set<StickDirection>>(new Set());
  const sprintingRef = useRef(false);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });

  const updateDirections = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxR = rect.width / 2 - 8;

      // Clamp knob visual position
      const clamp = Math.min(dist, maxR);
      const normX = dist > 0 ? (dx / dist) * clamp : 0;
      const normY = dist > 0 ? (dy / dist) * clamp : 0;
      setKnobOffset({ x: normX, y: normY });

      const prev = activeRef.current;
      if (dist < DEADZONE) {
        for (const d of prev) onInput(d, 'up');
        prev.clear();
        if (sprintingRef.current) {
          onInput('b', 'up');
          sprintingRef.current = false;
        }
        return;
      }

      // Sprint: outer zone auto-holds B (Gen 6/7 use B+direction to run)
      const fraction = dist / maxR;
      const shouldSprint = fraction >= RUN_THRESHOLD;
      if (shouldSprint !== sprintingRef.current) {
        onInput('b', shouldSprint ? 'down' : 'up');
        sprintingRef.current = shouldSprint;
      }

      const angle = Math.atan2(dy, dx);
      const next = new Set(angleToDirections(angle));

      for (const d of prev) {
        if (!next.has(d)) onInput(d, 'up');
      }
      for (const d of next) {
        if (!prev.has(d)) {
          navigator.vibrate?.(5);
          onInput(d, 'down');
        }
      }
      activeRef.current = next;
    },
    [onInput],
  );

  const releaseAll = useCallback(() => {
    for (const d of activeRef.current) onInput(d, 'up');
    activeRef.current = new Set();
    setKnobOffset({ x: 0, y: 0 });
    if (sprintingRef.current) {
      onInput('b', 'up');
      sprintingRef.current = false;
    }
  }, [onInput]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      updateDirections(e.touches[0].clientX, e.touches[0].clientY);
    },
    [updateDirections],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      updateDirections(e.touches[0].clientX, e.touches[0].clientY);
    },
    [updateDirections],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      releaseAll();
    },
    [releaseAll],
  );

  return (
    <div
      ref={containerRef}
      className="relative w-28 h-28 rounded-full bg-white/10 touch-none select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Knob */}
      <div
        className="absolute w-12 h-12 rounded-full bg-white/30 top-1/2 left-1/2 pointer-events-none"
        style={{
          transform: `translate(calc(-50% + ${knobOffset.x}px), calc(-50% + ${knobOffset.y}px))`,
        }}
      />
    </div>
  );
}

function FaceButtonGB({ onInput }: { onInput: TouchControlsProps['onInput'] }) {
  const aHandlers = useButtonHandlers('a', onInput, true);
  const bHandlers = useButtonHandlers('b', onInput, true);
  return (
    // Diagonal layout: B upper-left, A lower-right
    <div className="relative w-20 h-20">
      <button
        {...bHandlers}
        className={`${baseBtn} w-9 h-9 text-sm absolute top-0 left-0`}
        aria-label="B"
      >
        B
      </button>
      <button
        {...aHandlers}
        className={`${baseBtn} w-9 h-9 text-sm absolute bottom-0 right-0`}
        aria-label="A"
      >
        A
      </button>
    </div>
  );
}

function FaceButtonDiamond({ onInput }: { onInput: TouchControlsProps['onInput'] }) {
  const aHandlers = useButtonHandlers('a', onInput, true);
  const bHandlers = useButtonHandlers('b', onInput, true);
  const xHandlers = useButtonHandlers('x', onInput, true);
  const yHandlers = useButtonHandlers('y', onInput, true);
  return (
    // Diamond: X top, Y left, A right, B bottom
    <div className="grid grid-cols-3 grid-rows-3 gap-1 w-28 h-28">
      <div />
      <button {...xHandlers} className={`${baseBtn} w-8 h-8 text-xs`} aria-label="X">X</button>
      <div />
      <button {...yHandlers} className={`${baseBtn} w-8 h-8 text-xs`} aria-label="Y">Y</button>
      <div className="w-8 h-8 rounded-full bg-white/10" />
      <button {...aHandlers} className={`${baseBtn} w-8 h-8 text-xs`} aria-label="A">A</button>
      <div />
      <button {...bHandlers} className={`${baseBtn} w-8 h-8 text-xs`} aria-label="B">B</button>
      <div />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────

export default function TouchControls({
  system,
  onInput,
  onReset,
  onSpeed,
  onAnalogModifier,
}: TouchControlsProps) {
  const [visible, setVisible] = useState(true);
  const [speedIndex, setSpeedIndex] = useState(0);

  if (!isTouchDevice) return null;

  const currentSpeed = SPEED_CYCLE[speedIndex];
  const hasDiamond = system === 'nds' || system === '3ds';
  const has3DSShoulders = system === '3ds';

  const handleSpeedTap = (e: React.TouchEvent) => {
    e.preventDefault();
    const nextIndex = (speedIndex + 1) % SPEED_CYCLE.length;
    setSpeedIndex(nextIndex);
    onSpeed(SPEED_CYCLE[nextIndex]);
  };

  const handleResetTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    navigator.vibrate?.(20);
    onReset();
  };

  const startHandlers = useButtonHandlers('start', onInput);
  const selectHandlers = useButtonHandlers('select', onInput);
  const lHandlers = useButtonHandlers('l', onInput);
  const rHandlers = useButtonHandlers('r', onInput);
  const zlHandlers = useButtonHandlers('zl', onInput);
  const zrHandlers = useButtonHandlers('zr', onInput);

  if (!visible) {
    return (
      <div className="absolute bottom-4 right-4 z-10 pointer-events-auto">
        <button
          onTouchStart={(e) => { e.preventDefault(); setVisible(true); }}
          className="touch-none select-none w-10 h-10 rounded-full bg-white/30 active:bg-white/50 text-white text-xs font-bold flex items-center justify-center"
          aria-label="Show controls"
        >
          ⊕
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">

      {/* ── Shoulder buttons ────────────────────────────────────────────────── */}
      <div className="absolute top-2 left-3 flex gap-2 pointer-events-auto">
        {has3DSShoulders && (
          <button {...zlHandlers} className={`${baseBtn} px-3 h-8 text-xs rounded-lg`} aria-label="ZL">
            ZL
          </button>
        )}
        <button {...lHandlers} className={`${baseBtn} px-3 h-8 text-xs rounded-lg`} aria-label="L">
          L
        </button>
      </div>

      {/* Speed toggle — top center */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-auto">
        <button
          onTouchStart={handleSpeedTap}
          className="touch-none select-none px-3 h-8 rounded-lg bg-blue-500/30 active:bg-blue-500/50 text-blue-300 text-xs font-bold flex items-center justify-center"
          aria-label={`Speed ${SPEED_LABELS[speedIndex]}`}
        >
          {SPEED_LABELS[speedIndex]}
        </button>
      </div>

      <div className="absolute top-2 right-3 flex gap-2 pointer-events-auto">
        <button {...rHandlers} className={`${baseBtn} px-3 h-8 text-xs rounded-lg`} aria-label="R">
          R
        </button>
        {has3DSShoulders && (
          <button {...zrHandlers} className={`${baseBtn} px-3 h-8 text-xs rounded-lg`} aria-label="ZR">
            ZR
          </button>
        )}
      </div>

      {/* ── D-pad / Joystick (bottom left) ───────────────────────────────────── */}
      <div className="absolute bottom-10 left-4 pointer-events-auto">
        {system === '3ds' ? (
          <Joystick onInput={onInput} />
        ) : (
          <DPad onInput={onInput} />
        )}
      </div>

      {/* ── Start / Select / Reset ───────────────────────────────────────────
           Portrait: centered along the bottom, between D-pad and face buttons.
           Landscape: stacked above the face buttons (right side) so the row
           doesn't overlap the video in the middle of the screen. */}
      <div className="absolute flex gap-2 pointer-events-auto
                      bottom-10 left-1/2 -translate-x-1/2
                      landscape:bottom-40 landscape:right-4 landscape:left-auto landscape:translate-x-0">
        <button
          {...selectHandlers}
          className={`${baseBtn} px-3 h-7 text-sm rounded-lg`}
          aria-label="Select"
        >
          Sel
        </button>
        <button
          onTouchStart={handleResetTouch}
          className="touch-none select-none px-3 h-7 rounded-lg bg-red-500/25 active:bg-red-500/50 text-red-300 text-sm font-bold flex items-center justify-center"
          aria-label="Reset"
        >
          Rst
        </button>
        <button
          {...startHandlers}
          className={`${baseBtn} px-3 h-7 text-sm rounded-lg`}
          aria-label="Start"
        >
          Str
        </button>
      </div>

      {/* ── Face buttons (bottom right) ─────────────────────────────────────── */}
      <div className="absolute bottom-10 right-4 pointer-events-auto">
        {hasDiamond ? (
          <FaceButtonDiamond onInput={onInput} />
        ) : (
          <FaceButtonGB onInput={onInput} />
        )}
      </div>

      {/* ── Bottom bar: D-pad (3DS only) + hide toggle ─────────────────────── */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-auto">
        {system === '3ds' && (
          <div className="flex items-center gap-1">
            <DirButton button="left" label="◀" onInput={onInput} className="w-6 h-6 text-xs rounded-md" />
            <DirButton button="up" label="▲" onInput={onInput} className="w-6 h-6 text-xs rounded-md" />
            <DirButton button="down" label="▼" onInput={onInput} className="w-6 h-6 text-xs rounded-md" />
            <DirButton button="right" label="▶" onInput={onInput} className="w-6 h-6 text-xs rounded-md" />
          </div>
        )}
        <button
          onTouchStart={(e) => { e.preventDefault(); setVisible(false); }}
          className="touch-none select-none w-7 h-7 rounded-full bg-white/15 active:bg-white/30 text-white/50 text-xs font-bold flex items-center justify-center"
          aria-label="Hide controls"
        >
          ✕
        </button>
      </div>

    </div>
  );
}
