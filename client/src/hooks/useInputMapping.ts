import { useEffect, useRef, useCallback } from 'react';

export type GameButton =
  | 'up' | 'down' | 'left' | 'right'
  | 'stick_up' | 'stick_down' | 'stick_left' | 'stick_right'
  | 'a' | 'b' | 'x' | 'y'
  | 'l' | 'r' | 'zl' | 'zr'
  | 'start' | 'select';

type InputCallback = (data: Record<string, unknown>) => void;

const KEYBOARD_MAP: Record<string, GameButton> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyZ: 'a',
  KeyX: 'b',
  KeyW: 'x',
  KeyQ: 'y',
  KeyA: 'l',
  KeyS: 'r',
  Enter: 'start',
  Backspace: 'select',
};

// Standard gamepad button index → GameButton
const GAMEPAD_BUTTON_MAP: Record<number, GameButton> = {
  0: 'a',
  1: 'b',
  2: 'x',
  3: 'y',
  4: 'l',
  5: 'r',
  6: 'zl',
  7: 'zr',
  8: 'select',
  9: 'start',
  12: 'up',
  13: 'down',
  14: 'left',
  15: 'right',
};

export function useInputMapping(
  sendInput: InputCallback,
  active: boolean,
): {
  handleTouchInput: (button: GameButton, type: 'down' | 'up') => void;
} {
  // Track currently pressed keyboard keys to prevent repeat events
  const pressedKeysRef = useRef<Set<string>>(new Set());

  // Track connected gamepad indices
  const connectedGamepadsRef = useRef<Set<number>>(new Set());

  // Track pressed gamepad buttons per gamepad: gamepadIndex → Set<buttonIndex>
  const pressedGamepadButtonsRef = useRef<Map<number, Set<number>>>(new Map());

  // RAF handle for gamepad polling loop
  const rafHandleRef = useRef<number | null>(null);

  // ── Keyboard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const button = KEYBOARD_MAP[e.code];
      if (!button) return;

      e.preventDefault();

      // Skip key repeat
      if (pressedKeysRef.current.has(e.code)) return;
      pressedKeysRef.current.add(e.code);

      sendInput({ key: button, type: 'down' });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const button = KEYBOARD_MAP[e.code];
      if (!button) return;

      e.preventDefault();

      if (!pressedKeysRef.current.has(e.code)) return;
      pressedKeysRef.current.delete(e.code);

      sendInput({ key: button, type: 'up' });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);

      // Release all held keys on cleanup
      for (const code of pressedKeysRef.current) {
        const button = KEYBOARD_MAP[code];
        if (button) {
          sendInput({ key: button, type: 'up' });
        }
      }
      pressedKeysRef.current.clear();
    };
  }, [active, sendInput]);

  // ── Gamepad ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!active) return;

    const handleGamepadConnected = (e: GamepadEvent) => {
      connectedGamepadsRef.current.add(e.gamepad.index);
      pressedGamepadButtonsRef.current.set(e.gamepad.index, new Set());
    };

    const handleGamepadDisconnected = (e: GamepadEvent) => {
      const index = e.gamepad.index;

      // Release any held buttons for this gamepad
      const held = pressedGamepadButtonsRef.current.get(index);
      if (held) {
        for (const btnIndex of held) {
          const button = GAMEPAD_BUTTON_MAP[btnIndex];
          if (button) {
            sendInput({ key: button, type: 'up' });
          }
        }
      }

      connectedGamepadsRef.current.delete(index);
      pressedGamepadButtonsRef.current.delete(index);
    };

    const pollGamepads = () => {
      const gamepads = navigator.getGamepads();

      for (const gamepad of gamepads) {
        if (!gamepad || !connectedGamepadsRef.current.has(gamepad.index)) continue;

        const held = pressedGamepadButtonsRef.current.get(gamepad.index) ?? new Set<number>();

        gamepad.buttons.forEach((btn, btnIndex) => {
          const mapped = GAMEPAD_BUTTON_MAP[btnIndex];
          if (!mapped) return;

          const isPressed = btn.pressed;
          const wasPressed = held.has(btnIndex);

          if (isPressed && !wasPressed) {
            held.add(btnIndex);
            sendInput({ key: mapped, type: 'down' });
          } else if (!isPressed && wasPressed) {
            held.delete(btnIndex);
            sendInput({ key: mapped, type: 'up' });
          }
        });

        pressedGamepadButtonsRef.current.set(gamepad.index, held);
      }

      rafHandleRef.current = requestAnimationFrame(pollGamepads);
    };

    // Seed already-connected gamepads (browser may have them before listeners fire)
    for (const gamepad of navigator.getGamepads()) {
      if (gamepad) {
        connectedGamepadsRef.current.add(gamepad.index);
        pressedGamepadButtonsRef.current.set(gamepad.index, new Set());
      }
    }

    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    rafHandleRef.current = requestAnimationFrame(pollGamepads);

    return () => {
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);

      if (rafHandleRef.current !== null) {
        cancelAnimationFrame(rafHandleRef.current);
        rafHandleRef.current = null;
      }

      // Release all held gamepad buttons
      for (const [, held] of pressedGamepadButtonsRef.current) {
        for (const btnIndex of held) {
          const button = GAMEPAD_BUTTON_MAP[btnIndex];
          if (button) {
            sendInput({ key: button, type: 'up' });
          }
        }
      }

      connectedGamepadsRef.current.clear();
      pressedGamepadButtonsRef.current.clear();
    };
  }, [active, sendInput]);

  // ── Touch ─────────────────────────────────────────────────────────────────

  const handleTouchInput = useCallback(
    (button: GameButton, type: 'down' | 'up') => {
      sendInput({ key: button, type });
    },
    [sendInput],
  );

  return { handleTouchInput };
}
