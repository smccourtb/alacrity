import { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TypePill } from '@/components/icons';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import CompletionChips from './CompletionChips';
import EntrySidebar from './EntrySidebar';
import EntryEditor from './EntryEditor';
import GameInfo from '../GameInfo';
import { Sprite } from '@/components/Sprite';
import { useSpritePrefs } from '@/hooks/useSpritePrefs';

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

interface Props {
  species: any;
  onClose: () => void;
  onSave: () => void;
}

export default function SpeciesDetail({ species, onClose, onSave }: Props) {
  const [entries, setEntries] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [ribbons, setRibbons] = useState<any[]>([]);
  const [marks, setMarks] = useState<any[]>([]);
  const [balls, setBalls] = useState<any[]>([]);
  const [completion, setCompletion] = useState<any>(null);
  const [shinyMethods, setShinyMethods] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const { style } = useSpritePrefs();

  const loadEntries = () => {
    // Fetch collection entries (from saves) and manual entries, merge both
    Promise.all([
      api.collection.list(),
      api.pokemon.list({ species_id: species.id }),
    ]).then(([identityAll, manualEntries]) => {
      // Filter identity entries for this species and map to entry shape
      const fromIdentity = identityAll
        .filter((e: any) => e.species_id === species.id)
        .map((e: any) => {
          const snap = e.snapshot_data
            ? (typeof e.snapshot_data === 'string' ? JSON.parse(e.snapshot_data) : e.snapshot_data)
            : {};
          return {
            id: `identity_${e.identity_id}`,
            species_id: e.species_id,
            species_name: snap.species_name || species.name,
            level: e.level ?? snap.level,
            is_shiny: snap.is_shiny ? 1 : 0,
            origin_game: snap.origin_game ?? e.game ?? null,
            ball: snap.ball ?? null,
            nature: snap.nature ?? null,
            ability: snap.ability ?? null,
            gender: snap.gender ?? null,
            nickname: snap.nickname ?? null,
            ot_name: snap.ot_name ?? e.ot_name ?? null,
            ot_tid: snap.ot_tid ?? e.ot_tid ?? null,
            sprite_url: species.sprite_url,
            shiny_sprite_url: species.shiny_sprite_url,
            ribbons: '[]',
            marks: '[]',
            move1: snap.moves?.[0] ?? null,
            move2: snap.moves?.[1] ?? null,
            move3: snap.moves?.[2] ?? null,
            move4: snap.moves?.[3] ?? null,
            ivs: snap.ivs ?? null,
            evs: snap.evs ?? null,
            source: e.checkpoint_id ? 'save' : 'bank',
            identity_id: e.identity_id,
            checkpoint_id: e.checkpoint_id,
            save_file_id: e.save_file_id ?? null,
            save_filename: e.save_filename ?? null,
            save_file_path: e.save_file_path ?? null,
            game: e.game ?? null,
            playthrough_id: e.playthrough_id ?? null,
            _readonly: true,  // Flag: identity entries can't be edited
          };
        });

      // Manual entries already have the right shape from the API
      const fromManual = manualEntries.map((e: any) => ({
        ...e,
        species_name: e.species_name || species.name,
        sprite_url: e.sprite_url || species.sprite_url,
        shiny_sprite_url: e.shiny_sprite_url || species.shiny_sprite_url,
        source: 'manual',
        _readonly: false,
      }));

      const all = [...fromIdentity, ...fromManual];
      setEntries(all);
      if (all.length > 0 && !selectedId) setSelectedId(all[0].id);
    });

    api.pokemon.completionForSpecies(species.id).then(setCompletion);
  };

  useEffect(() => {
    loadEntries();
    api.reference.ribbons().then(setRibbons);
    api.reference.marks().then(setMarks);
    api.reference.balls().then(setBalls);
    api.reference.shinyMethods({ species_id: species.id }).then(setShinyMethods);
    api.species.forms(species.id).then(setForms);
  }, [species.id]);

  const selected = entries.find(e => e.id === selectedId) || null;

  const handleUpdate = async (id: string | number, data: any) => {
    if (typeof id === 'string') return; // Identity entries are read-only
    await api.pokemon.update(id, data);
    loadEntries();
    onSave();
  };

  const handleDelete = async (id: string | number) => {
    if (typeof id === 'string') return; // Identity entries are read-only
    await api.pokemon.delete(id);
    setSelectedId(null);
    loadEntries();
    onSave();
  };

  const handleCreate = async () => {
    const newEntry = await api.pokemon.create({ species_id: species.id, source: 'manual' });
    loadEntries();
    setSelectedId(newEntry.id);
    onSave();
  };

  return (
    <>
      {/* Header: sprites + species info */}
      <div className="flex items-start gap-4 mb-3">
        <div className="flex gap-2">
          <Sprite kind="pokemon" id={species.id} style={style} size={80} alt={species.name} className="w-20 h-20" />
          <Sprite kind="pokemon" id={species.id} shiny style={style} size={80} alt={`${species.name} shiny`} className="w-20 h-20" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-extrabold capitalize">#{species.id} {species.name}</h3>
          <div className="flex gap-1.5 mt-1.5">
            <TypePill type={species.type1} size="md" />
            {species.type2 && <TypePill type={species.type2} size="md" />}
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {species.ability1 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold capitalize">
                {species.ability1}
              </span>
            )}
            {species.ability2 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold capitalize">
                {species.ability2}
              </span>
            )}
            {species.hidden_ability && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 text-xs font-semibold capitalize">
                {species.hidden_ability} <span className="ml-0.5 text-2xs opacity-60">(HA)</span>
              </span>
            )}
          </div>
          {/* Forms strip */}
          {forms.length > 1 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {forms.map(f => (
                <div
                  key={f.id}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold ${
                    f.is_battle_only
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-blue-50 text-blue-600'
                  }`}
                  title={f.is_battle_only ? `${f.form_name} (Battle Only)` : f.form_name}
                >
                  <img src={f.sprite_url} alt={f.form_name} className="w-4 h-4 [image-rendering:pixelated]" />
                  {f.form_name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Completion chips */}
      <CompletionChips completion={completion} />

      <Separator className="my-3" />

      {/* Tabs */}
      <Tabs defaultValue="collection">
        <TabsList className="mb-3 bg-surface-sunken rounded-full p-1 h-auto">
          <TabsTrigger value="collection" className="rounded-full text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">Collection</TabsTrigger>
          <TabsTrigger value="info" className="rounded-full text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">Info</TabsTrigger>
          <TabsTrigger value="shiny" className="rounded-full text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">Shiny</TabsTrigger>
          <TabsTrigger value="links" className="rounded-full text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">Links</TabsTrigger>
        </TabsList>

        {/* Collection tab — sidebar-split layout */}
        <TabsContent value="collection">
          <SidebarProvider defaultOpen={true} className="!min-h-0">
            <EntrySidebar
              entries={entries}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onAdd={handleCreate}
            />
            <SidebarInset className="overflow-x-hidden pl-4 !bg-transparent !shadow-none">
              {selected ? (
                <EntryEditor
                  entry={selected}
                  species={species}
                  ribbons={ribbons}
                  marks={marks}
                  balls={balls}
                  forms={forms}
                  onUpdate={(data) => handleUpdate(selected.id, data)}
                  onDelete={() => handleDelete(selected.id)}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  {entries.length === 0 ? 'No entries yet. Click + Add to start.' : 'Select an entry'}
                </div>
              )}
            </SidebarInset>
          </SidebarProvider>
        </TabsContent>

        {/* Info tab — Game Info (moves, encounters, stats) */}
        <TabsContent value="info">
          <GameInfo speciesId={species.id} onClose={onClose} />
        </TabsContent>

        {/* Shiny tab — hunting methods per game */}
        <TabsContent value="shiny">
          {shinyMethods.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground/60 uppercase tracking-wider">Shiny Hunting Methods</h4>
              <div className="grid grid-cols-1 gap-1.5">
                {shinyMethods.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/30">
                    <span className="text-xs font-bold text-muted-foreground/50 w-24 flex-shrink-0">{m.game}</span>
                    <span className="text-sm font-semibold flex-1">{m.method}</span>
                    {m.odds && (
                      <span className="text-xs font-bold text-primary">{m.odds}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground/50 text-sm py-8">
              No shiny hunting data available for {capitalize(species.name)}.
            </div>
          )}
        </TabsContent>

        {/* Links tab */}
        <TabsContent value="links">
          <div className="flex gap-2 flex-wrap">
            {[
              { label: 'Serebii', url: `https://www.serebii.net/pokedex-sv/${species.name}` },
              { label: 'Bulbapedia', url: `https://bulbapedia.bulbagarden.net/wiki/${capitalize(species.name)}_(Pok%C3%A9mon)` },
              { label: 'Smogon', url: `https://www.smogon.com/dex/sv/pokemon/${species.name}` },
              { label: 'PokemonDB', url: `https://pokemondb.net/pokedex/${species.name}` },
            ].map(link => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-surface-raised px-4 py-1.5 text-sm font-medium hover:bg-surface-sunken transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
