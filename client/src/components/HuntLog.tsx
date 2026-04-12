import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';

interface LogEntry {
  raw: string;
  instance: string;
  timestamp: string;
  attempt: number;
  pokemon: string;
  atk: number;
  def: number;
  spd: number;
  spc: number;
  isShiny: boolean;
  isBestShiny: boolean;
  isSkip: boolean;
  isHeader: boolean;
}

function dvColor(value: number): string {
  if (value === 15) return 'text-green-400';
  if (value >= 13) return 'text-green-400/80';
  if (value >= 7) return 'text-[#888]';
  if (value >= 1) return 'text-red-400/70';
  return 'text-red-400';
}

function parseLine(raw: string): LogEntry | null {
  const entry: LogEntry = {
    raw,
    instance: '',
    timestamp: '',
    attempt: 0,
    pokemon: '',
    atk: -1,
    def: -1,
    spd: -1,
    spc: -1,
    isShiny: false,
    isBestShiny: false,
    isSkip: false,
    isHeader: false,
  };

  // Extract instance prefix: [#10] ...
  const instMatch = raw.match(/^\[#(\d+)\]\s*/);
  if (instMatch) {
    entry.instance = instMatch[1];
    raw = raw.slice(instMatch[0].length);
  }

  // Extract timestamp: HH:MM:SS
  const timeMatch = raw.match(/^(\d{2}:\d{2}:\d{2})\s*/);
  if (timeMatch) {
    entry.timestamp = timeMatch[1];
    raw = raw.slice(timeMatch[0].length);
  }

  // Shiny hit: !!! SHINY Pikachu after 1097 attempts! Atk:6 Def:10 Spd:10 Spc:10 !!!
  // Also: !!! BEST SHINY Pikachu after 1856 attempts! Atk:15 Def:10 Spd:10 Spc:10 !!!
  // Egg format: !!! SHINY EGG #2 after 2 total eggs! Atk:11 Def:10 Spd:10 Spc:10 !!!
  // Egg hatched: !!! SHINY HATCHED (species 7) after 3 eggs! Atk:14 Def:10 Spd:10 Spc:10 !!!
  const shinyMatch = raw.match(/!!!\s*(BEST[_ ])?SHINY\s+(\w[\w\s]*?)\s+after\s+(\d+)\s+(?:total\s+)?(?:attempts|eggs)!\s+Atk:(\d+)\s+Def:(\d+)\s+Spd:(\d+)\s+Spc:(\d+)/);
  if (shinyMatch) {
    entry.isBestShiny = !!shinyMatch[1];
    entry.isShiny = true;
    entry.pokemon = shinyMatch[2].trim();
    entry.attempt = parseInt(shinyMatch[3]);
    entry.atk = parseInt(shinyMatch[4]);
    entry.def = parseInt(shinyMatch[5]);
    entry.spd = parseInt(shinyMatch[6]);
    entry.spc = parseInt(shinyMatch[7]);
    return entry;
  }

  // Regular attempt: Attempt 1: Pikachu Atk:14 Def:2 Spd:15 Spc:7
  // Or without pokemon: Attempt 1: Atk:4 Def:7 Spd:9 Spc:15
  // Or with encounters: Attempt 1: Ditto Atk:7 Def:7 Spd:9 Spc:4 (30 encounters)
  // Egg format: Egg 1: Atk:9 Def:10 Spd:8 Spc:10
  const attemptMatch = raw.match(/(?:Attempt|Egg)\s+(\d+):\s*(?:(\w[\w\s]*?)\s+)?Atk:(\d+)\s+Def:(\d+)\s+Spd:(\d+)\s+Spc:(\d+)/);
  if (attemptMatch) {
    entry.attempt = parseInt(attemptMatch[1]);
    entry.pokemon = attemptMatch[2]?.trim() || '';
    entry.atk = parseInt(attemptMatch[3]);
    entry.def = parseInt(attemptMatch[4]);
    entry.spd = parseInt(attemptMatch[5]);
    entry.spc = parseInt(attemptMatch[6]);
    return entry;
  }

  // Skip line: Skipped 10 non-Ditto encounters (10 total)
  if (raw.includes('Skipped')) {
    entry.isSkip = true;
    return entry;
  }

  // Header/info lines
  if (raw.includes('running!') || raw.includes('hunter') ||
      raw.includes('Game loaded') || raw.includes('Egg ready') ||
      raw.includes('Egg received') || raw.includes('daycare') ||
      raw.includes('Continuing') || raw.includes('Cycle done') ||
      raw.includes('walking for egg') || raw.includes('Continuous mode') ||
      raw.includes('HATCHED') || raw.includes('Shiny egg found')) {
    entry.isHeader = true;
    return entry;
  }

  return null;
}

function pad(n: number, width: number): string {
  const s = String(n);
  return s.length >= width ? s : ' '.repeat(width - s.length) + s;
}

export default function HuntLog({ logs }: { logs: string[] }) {
  const [search, setSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLogLen = useRef(logs.length);

  const entries = useMemo(() => {
    const parsed: LogEntry[] = [];
    for (const line of logs) {
      const entry = parseLine(line);
      if (entry) parsed.push(entry);
    }
    return parsed;
  }, [logs]);

  const filtered = useMemo(() => {
    if (!search) return entries;
    const q = search.toLowerCase();
    return entries.filter(e =>
      e.raw.toLowerCase().includes(q) ||
      e.instance.includes(q) ||
      e.pokemon.toLowerCase().includes(q)
    );
  }, [entries, search]);

  // Track new entries when paused
  useEffect(() => {
    if (!autoScroll && logs.length > prevLogLen.current) {
      setNewCount(c => c + (logs.length - prevLogLen.current));
    }
    prevLogLen.current = logs.length;
  }, [logs.length, autoScroll]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [filtered, autoScroll]);

  // Detect user scroll
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (atBottom && !autoScroll) {
      setAutoScroll(true);
      setNewCount(0);
    } else if (!atBottom && autoScroll) {
      setAutoScroll(false);
    }
  }, [autoScroll]);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
    setAutoScroll(true);
    setNewCount(0);
  };

  const attemptEntries = filtered.filter(e => e.attempt > 0);

  return (
    <div className="relative">
      {/* Dark terminal card */}
      <div className="bg-[#1a1a22] rounded-2xl overflow-hidden">
        {/* Header with search */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]">
          <span className="text-2xs text-[#555] uppercase tracking-widest font-medium">Live Feed</span>
          <div className="relative">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-6 w-36 font-mono bg-white/[0.04] rounded-lg px-3 text-[#888] placeholder:text-[#444] focus-visible:ring-1 focus-visible:ring-white/10"
            />
            {search && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-2xs text-[#555]">
                {attemptEntries.length}
              </span>
            )}
          </div>
        </div>

        {/* Column header */}
        <div className="font-mono text-2xs text-[#444] px-4 py-1.5 flex select-none">
          <span className="w-[4ch] text-right shrink-0">Inst</span>
          <span className="w-[7ch] text-center shrink-0 ml-2">Time</span>
          <span className="w-[7ch] text-right shrink-0 ml-2">Att#</span>
          <span className="w-[10ch] shrink-0 ml-3">Pokemon</span>
          <span className="w-[4ch] text-right shrink-0 ml-2">Atk</span>
          <span className="w-[4ch] text-right shrink-0 ml-1">Def</span>
          <span className="w-[4ch] text-right shrink-0 ml-1">Spd</span>
          <span className="w-[4ch] text-right shrink-0 ml-1">Spc</span>
        </div>

        {/* Log rows */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="px-3 pb-3 max-h-80 overflow-y-auto font-mono text-[10.5px] leading-[1.8]"
        >
          {filtered.length === 0 && (
            <div className="text-[#555] text-center py-8">
              {search ? 'No matching logs' : 'Waiting for logs...'}
            </div>
          )}
          {filtered.map((entry, i) => {
            if (entry.isHeader) {
              return (
                <div key={i} className="text-[#333] text-2xs px-1">
                  {entry.raw}
                </div>
              );
            }
            if (entry.isSkip) {
              return (
                <div key={i} className="text-[#333] text-2xs px-1 italic">
                  [{entry.instance ? `#${entry.instance}` : ''}] {entry.raw.replace(/^\[#\d+\]\s*/, '').replace(/^\d{2}:\d{2}:\d{2}\s*/, '')}
                </div>
              );
            }
            if (entry.attempt === 0) return null;

            const isShiny = entry.isShiny;
            const rowClass = isShiny
              ? 'bg-yellow-500/[0.06] border-l-2 border-yellow-500 pl-2 -ml-1 rounded'
              : 'px-1';

            return (
              <div key={i} className={`flex ${rowClass} hover:bg-white/[0.02]`}>
                <span className={`w-[4ch] text-right shrink-0 ${isShiny ? 'text-yellow-500' : 'text-[#555]'}`}>
                  {entry.instance ? `#${entry.instance}` : ''}
                </span>
                <span className={`w-[7ch] text-center shrink-0 ml-2 ${isShiny ? 'text-yellow-500' : 'text-[#383838]'}`}>
                  {entry.timestamp}
                </span>
                <span className={`w-[7ch] text-right shrink-0 ml-2 ${isShiny ? 'text-yellow-500 font-bold' : 'text-[#999]'}`}>
                  {entry.attempt.toLocaleString()}
                </span>
                <span className={`w-[10ch] shrink-0 ml-3 truncate ${isShiny ? 'text-yellow-500 font-bold' : 'text-[#777]'}`}>
                  {entry.isShiny && (entry.isBestShiny ? '** ' : '* ')}{entry.pokemon}
                </span>
                <span className={`w-[4ch] text-right shrink-0 ml-2 ${isShiny ? 'text-yellow-500 font-bold' : dvColor(entry.atk)}`}>
                  {pad(entry.atk, 2)}
                </span>
                <span className={`w-[4ch] text-right shrink-0 ml-1 ${isShiny ? 'text-yellow-500 font-bold' : dvColor(entry.def)}`}>
                  {pad(entry.def, 2)}
                </span>
                <span className={`w-[4ch] text-right shrink-0 ml-1 ${isShiny ? 'text-yellow-500 font-bold' : dvColor(entry.spd)}`}>
                  {pad(entry.spd, 2)}
                </span>
                <span className={`w-[4ch] text-right shrink-0 ml-1 ${isShiny ? 'text-yellow-500 font-bold' : dvColor(entry.spc)}`}>
                  {pad(entry.spc, 2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scroll-to-bottom pill */}
      {!autoScroll && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-3 right-4 bg-white/10 backdrop-blur text-white text-xs px-4 py-1.5 rounded-full shadow-lg hover:bg-white/15 transition-colors flex items-center gap-1.5"
        >
          {newCount > 0 && <span className="font-bold">+{newCount}</span>}
          <span>&#8595; Latest</span>
        </button>
      )}
    </div>
  );
}
