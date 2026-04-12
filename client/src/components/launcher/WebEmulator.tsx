import { useEffect, useRef, useState } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';

interface WebEmulatorProps {
  saveId: number;
  game: string;
  label: string;
  onClose: (saveData: ArrayBuffer | null) => void;
}

const EJS_CDN = 'https://cdn.emulatorjs.org/stable/data/';

/** Fully destroy the EmulatorJS instance — stop audio, kill game loop, remove DOM */
function destroyEmulator() {
  const ejs = (window as any).EJS_emulator;
  if (ejs) {
    // Pause the game to stop the frame loop
    try { ejs.pause?.(); } catch {}
    // Stop all audio
    try {
      if (ejs.audioContext) {
        ejs.audioContext.close();
      }
    } catch {}
    try {
      if (ejs.gameManager) {
        ejs.gameManager.saveSaveFiles?.();
        ejs.gameManager.quit?.();
      }
    } catch {}
  }

  // Suspend any lingering AudioContexts
  try {
    const ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (ctx) {
      // EmulatorJS creates audio contexts on the window — find and close them
      document.querySelectorAll('audio, video').forEach(el => {
        (el as HTMLMediaElement).pause();
        (el as HTMLMediaElement).src = '';
      });
    }
  } catch {}

  // Remove all EmulatorJS DOM elements
  document.querySelectorAll('script[src*="emulatorjs"]').forEach(el => el.remove());
  document.querySelectorAll('script[src*="cdn.emulatorjs"]').forEach(el => el.remove());
  // EmulatorJS injects canvas, divs with ejs_ prefix, and style elements
  document.querySelectorAll('[id^="ejs_"], [class*="ejs_"]').forEach(el => el.remove());

  // Clean up globals
  const globals = [
    'EJS_player', 'EJS_gameUrl', 'EJS_core', 'EJS_gameName',
    'EJS_color', 'EJS_startOnLoaded', 'EJS_gamePatchUrl',
    'EJS_gameParentUrl', 'EJS_pathtodata', 'EJS_onGameStart',
    'EJS_emulator', 'EJS_ready', 'EJS_threads', 'EJS_defaultOptions',
  ];
  for (const g of globals) delete (window as any)[g];
}

export default function WebEmulator({ saveId, game, label, onClose }: WebEmulatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const saveDataRef = useRef<Uint8Array | null>(null);
  const initializedRef = useRef(false);

  // Warn before accidental tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    // Prevent double-init from React StrictMode
    if (initializedRef.current) return;
    initializedRef.current = true;

    const romUrl = api.launcher.romUrl(game);
    const saveUrl = api.launcher.saveFile(saveId);

    fetch(saveUrl)
      .then(r => r.arrayBuffer())
      .then(saveBuffer => {
        saveDataRef.current = new Uint8Array(saveBuffer);

        (window as any).EJS_player = '#emulator-container';
        (window as any).EJS_gameUrl = romUrl;
        (window as any).EJS_core = 'mgba';
        (window as any).EJS_gameName = `${game} - ${label}`;
        (window as any).EJS_color = '#1a1a2e';
        (window as any).EJS_startOnLoaded = true;
        (window as any).EJS_gamePatchUrl = '';
        (window as any).EJS_gameParentUrl = '';
        (window as any).EJS_pathtodata = EJS_CDN;
        (window as any).EJS_threads = false; // threads can cause audio glitches on mobile
        (window as any).EJS_defaultOptions = {
          'shader': 'disabled',
        };

        (window as any).EJS_onGameStart = () => {
          try {
            const ejs = (window as any).EJS_emulator;
            if (ejs && ejs.gameManager && saveDataRef.current) {
              const savePath = ejs.gameManager.getSaveFilePath();
              const parts = savePath.split('/');
              let cp = '';
              for (let i = 0; i < parts.length - 1; i++) {
                if (parts[i] === '') continue;
                cp += '/' + parts[i];
                if (!ejs.gameManager.FS.analyzePath(cp).exists) {
                  ejs.gameManager.FS.mkdir(cp);
                }
              }
              if (ejs.gameManager.FS.analyzePath(savePath).exists) {
                ejs.gameManager.FS.unlink(savePath);
              }
              ejs.gameManager.FS.writeFile(savePath, saveDataRef.current);
              ejs.gameManager.loadSaveFiles();
            }
          } catch (err) {
            console.error('Failed to load save into emulator:', err);
          }
        };

        const script = document.createElement('script');
        script.src = `${EJS_CDN}loader.js`;
        script.async = true;
        script.onerror = () => setError('Failed to load EmulatorJS. Check your internet connection.');
        document.body.appendChild(script);
      })
      .catch(() => setError('Failed to fetch save file.'));

    // Cleanup on unmount — MUST fully destroy the emulator
    return () => { destroyEmulator(); };
  }, [saveId, game, label]);

  const handleStop = () => {
    // Extract save data BEFORE destroying
    let extractedSave: ArrayBuffer | null = null;
    try {
      const ejs = (window as any).EJS_emulator;
      if (ejs && ejs.gameManager) {
        const saveData = ejs.gameManager.getSaveFile();
        if (saveData) {
          extractedSave = saveData.buffer || saveData;
        }
      }
    } catch {}

    // Destroy emulator (stops audio, kills game loop)
    destroyEmulator();

    onClose(extractedSave);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-white">
        <span className="text-base font-medium">
          {game} — {label}
        </span>
        <Button size="sm" variant="destructive" className="rounded-xl" onClick={handleStop}>
          Stop Playing
        </Button>
      </div>
      {error && (
        <div className="p-4 text-destructive text-center text-sm">{error}</div>
      )}
      <div
        id="emulator-container"
        ref={containerRef}
        className="flex-1"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
