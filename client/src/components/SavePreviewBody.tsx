// client/src/components/SavePreviewBody.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PartyRow } from '@/components/pokemon/PartyRow';
import { BoxGrid } from '@/components/pokemon/BoxGrid';
import { DaycareCard } from '@/components/pokemon/DaycareCard';
import { StatRow } from '@/components/ui/stat-row';
import { User, Shield, MapPin, Gamepad2 } from 'lucide-react';
import { safeSpeciesName } from '@/components/pokemon/sprites';
import type { SaveSnapshot } from '@/components/timeline/types';
import type { SlotSize } from '@/components/pokemon/PokemonSlot';
import type { SlotPokemon } from '@/components/pokemon/PokemonSlot';

interface SavePreviewBodyProps {
  snapshot: SaveSnapshot;
  showPills?: boolean;
  showParty?: boolean;
  showBoxes?: boolean;
  showNotes?: boolean;
  showProgress?: boolean;
  showDaycare?: boolean;
  notes?: string | null;
  onNotesChange?: (notes: string) => Promise<void>;
  partySize?: SlotSize;
  boxSize?: SlotSize;
  children?: React.ReactNode;
  className?: string;
}

/** Convert snapshot party member to SlotPokemon for PokemonSlot */
function toSlotPokemon(p: SaveSnapshot['party'][number]): SlotPokemon {
  return {
    species_id: p.species_id,
    name: p.species_name,
    level: p.level,
    is_shiny: p.is_shiny,
    is_egg: p.is_egg,
    moves: p.moves,
    nature: p.nature,
    ability: p.ability,
    ball: p.ball,
    has_pokerus: p.has_pokerus,
    ivs: p.ivs,
    evs: p.evs,
  };
}

export function SavePreviewBody({
  snapshot,
  showPills = true,
  showParty = true,
  showBoxes = false,
  showNotes = false,
  showProgress = false,
  showDaycare = true,
  notes,
  onNotesChange,
  partySize = 'md',
  boxSize = 'sm',
  children,
  className,
}: SavePreviewBodyProps) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(notes ?? '');
  const [saving, setSaving] = useState(false);

  const badgeProgress = snapshot.max_badges
    ? (snapshot.badge_count / snapshot.max_badges)
    : 0;

  const partySlots = snapshot.party.map(toSlotPokemon);

  const handleSaveNotes = async () => {
    if (!onNotesChange) return;
    setSaving(true);
    await onNotesChange(notesDraft);
    setEditingNotes(false);
    setSaving(false);
  };

  return (
    <div className={`flex flex-col gap-3 ${className ?? ''}`}>
      {/* Metadata pills */}
      {showPills && (
        <div className="flex flex-wrap gap-2">
          {snapshot.ot_name && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-raised text-sm font-medium">
              <User className="w-3 h-3 text-muted-foreground" />
              {safeSpeciesName(snapshot.ot_name)}
              {snapshot.ot_tid !== undefined && <span className="text-muted-foreground/60">#{snapshot.ot_tid}</span>}
            </span>
          )}
          {snapshot.badge_count >= 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-raised text-sm font-medium">
              <Shield className="w-3 h-3 text-amber-500" />
              <span className="text-amber-600">{snapshot.badge_count}</span>
              {snapshot.max_badges && <span className="text-muted-foreground/60">/ {snapshot.max_badges}</span>}
            </span>
          )}
          {snapshot.location && snapshot.location !== 'unknown' && snapshot.location !== '' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-raised text-sm font-medium">
              <MapPin className="w-3 h-3 text-muted-foreground" />
              {snapshot.location}
            </span>
          )}
          {snapshot.game && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-raised text-sm font-medium">
              <Gamepad2 className="w-3 h-3 text-muted-foreground" />
              {snapshot.game}
            </span>
          )}
        </div>
      )}

      {/* Progress bar */}
      {showProgress && snapshot.max_badges && (
        <StatRow
          label="Progress"
          value={`${snapshot.badge_count}/${snapshot.max_badges}`}
          bar={badgeProgress}
          barGradient="bg-gradient-to-r from-red-500 to-orange-500"
        />
      )}

      {/* Notes — editable */}
      {showNotes && onNotesChange && (
        editingNotes ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveNotes();
                }
                if (e.key === 'Escape') {
                  setNotesDraft(notes ?? '');
                  setEditingNotes(false);
                }
              }}
              placeholder="Add a note..."
              rows={2}
              className="w-full px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/20"
              disabled={saving}
            />
            <div className="flex gap-1.5">
              <Button size="sm" className="h-6 text-sm rounded-lg px-2.5" onClick={handleSaveNotes} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-sm rounded-lg px-2.5" onClick={() => {
                setNotesDraft(notes ?? '');
                setEditingNotes(false);
              }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 -mx-1 rounded-lg cursor-pointer hover:bg-surface-raised transition-colors group"
            onClick={() => { setNotesDraft(notes ?? ''); setEditingNotes(true); }}
          >
            <svg className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors shrink-0" viewBox="0 0 16 16" fill="none">
              <path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-sm text-muted-foreground/70 group-hover:text-muted-foreground transition-colors">
              {notes || 'Add a note...'}
            </span>
          </div>
        )
      )}

      {/* Read-only notes (when no onNotesChange) */}
      {showNotes && !onNotesChange && notes && (
        <div className="rounded-md bg-surface-raised p-3 text-sm text-muted-foreground">
          {notes}
        </div>
      )}

      {/* Party */}
      {showParty && partySlots.length > 0 && (
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Party</span>
          <PartyRow
            party={partySlots}
            size={partySize}
            tooltip="full"
            showEmpty={false}
            showLevel
            className="mt-1"
          />
        </div>
      )}

      {/* Daycare */}
      {showDaycare && snapshot.daycare && (
        <DaycareCard
          parent1={snapshot.daycare.parent1?.species_name ?? null}
          parent2={snapshot.daycare.parent2?.species_name ?? null}
          offspring={snapshot.daycare.offspring?.species_name ?? null}
          shinyOdds={snapshot.daycare.shiny_odds}
        />
      )}

      {/* Box Pokemon */}
      {showBoxes && snapshot.box_pokemon && snapshot.box_pokemon.length > 0 && (
        <BoxGrid
          pokemon={snapshot.box_pokemon.map(p => ({
            species_id: p.species_id,
            name: p.species_name,
            level: p.level,
            is_shiny: p.is_shiny,
            moves: p.moves,
            box: p.box,
            nature: p.nature,
            ability: p.ability,
            ball: p.ball,
            has_pokerus: p.has_pokerus,
            ivs: p.ivs,
            evs: p.evs,
          }))}
          slotSize={boxSize}
          tooltip="full"
        />
      )}

      {/* Page-specific extras (diff summary, etc.) */}
      {children}
    </div>
  );
}
