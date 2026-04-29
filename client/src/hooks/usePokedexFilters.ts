import { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../api/client';
import type { Lens } from '@/components/FilterBar';
import {
  type FilterState,
  type GameVersion,
  DEFAULT_FILTERS,
  GEN_RANGE,
  GAME_TO_ORIGIN as GAME_TO_ORIGIN_FALLBACK,
  ORIGIN_LEGAL_BALLS,
  BATTLE_FACILITY_BANNED,
  BATTLE_FACILITY_RIBBON_CATEGORIES,
  deriveGameMaps,
} from '@/lib/filter-options';
import { BALL_CATEGORIES } from '@/lib/ball-legality';

export function usePokedexFilters() {
  const [species, setSpecies] = useState<any[]>([]);
  const [collection, setCollection] = useState<any[]>([]);
  const [filters, setFilters] = useState<FilterState>(() => {
    const saved = localStorage.getItem('pokedex-filters');
    return saved ? { ...DEFAULT_FILTERS, ...JSON.parse(saved) } : { ...DEFAULT_FILTERS };
  });
  const [search, setSearch] = useState('');
  const [lens, setLens] = useState<Lens>('national');
  const [globalCompletion, setGlobalCompletion] = useState<any>(null);

  // Reference data for FilterBar
  const [balls, setBalls] = useState<any[]>([]);
  const [ribbons, setRibbons] = useState<any[]>([]);
  const [marks, setMarks] = useState<any[]>([]);
  const [gameVersions, setGameVersions] = useState<GameVersion[]>([]);
  const [sourceCounts, setSourceCounts] = useState<{ save: number; bank: number; manual: number }>({ save: 0, bank: 0, manual: 0 });
  const [sourceOverrides, setSourceOverrides] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('pokedex-source-overrides');
    return saved ? JSON.parse(saved) : {};
  });

  const activeSources = useMemo(() => {
    const result: Record<string, boolean> = {};
    for (const key of ['save', 'bank', 'manual'] as const) {
      if (key in sourceOverrides) {
        result[key] = sourceOverrides[key];
      } else {
        result[key] = sourceCounts[key] > 0;
      }
    }
    return result;
  }, [sourceCounts, sourceOverrides]);

  const toggleSource = useCallback((source: 'save' | 'bank' | 'manual') => {
    setSourceOverrides(prev => {
      const currentActive = !(prev[source] ?? sourceCounts[source] > 0);
      const next = { ...prev, [source]: currentActive };
      // Don't allow disabling the last active source
      const activeCount = (['save', 'bank', 'manual'] as const).filter(k => {
        if (k in next) return next[k];
        return sourceCounts[k] > 0;
      }).length;
      if (activeCount === 0) return prev;
      localStorage.setItem('pokedex-source-overrides', JSON.stringify(next));
      return next;
    });
  }, [sourceCounts]);

  // Derive legality maps from game_versions API data (single source of truth)
  const { gameToOrigin, gameMaxSpecies, originMaxSpecies } = useMemo(
    () => gameVersions.length > 0
      ? deriveGameMaps(gameVersions)
      : { gameToOrigin: GAME_TO_ORIGIN_FALLBACK, gameMaxSpecies: {} as Record<string, number>, originMaxSpecies: {} as Record<string, number> },
    [gameVersions]
  );

  // Per-game dex membership for gen 8/9 games whose regional dex is a strict
  // subset of the national dex (Galar, BDSP, Hisui, Paldea, Lumiose). For
  // these, max_species_id is wrong because Paldea/etc. share the global cap
  // (1025) while the actual in-game dex is ~400. species_in_dex stores the
  // real list per game; the filter pipeline below prefers it over max_species_id
  // whenever an entry is loaded.
  //
  // Display name → slug map matches the keys species_in_dex uses (PokeAPI
  // game slugs from gen8-9-reference.json + 'legends-z-a' for Lumiose).
  const GAME_DISPLAY_TO_DEX_SLUG: Record<string, string> = {
    Sword: 'sword', Shield: 'shield',
    'Brilliant Diamond': 'brilliant-diamond', 'Shining Pearl': 'shining-pearl',
    'Legends Arceus': 'legends-arceus',
    Scarlet: 'scarlet', Violet: 'violet',
    'Legends Z-A': 'legends-z-a',
  };
  const [dexMembership, setDexMembership] = useState<Record<string, Set<number>>>({});
  useEffect(() => {
    const needed = filters.games
      .map(g => GAME_DISPLAY_TO_DEX_SLUG[g])
      .filter((s): s is string => Boolean(s) && !(s in dexMembership));
    if (needed.length === 0) return;
    Promise.all(needed.map(async slug => {
      const rows = await api.reference.speciesInDex(slug);
      return [slug, new Set(rows.map(r => r.species_id))] as const;
    })).then(pairs => {
      setDexMembership(prev => {
        const next = { ...prev };
        for (const [slug, set] of pairs) next[slug] = set;
        return next;
      });
    });
  }, [filters.games, dexMembership]);

  // Persist filter state
  useEffect(() => {
    localStorage.setItem('pokedex-filters', JSON.stringify(filters));
  }, [filters]);

  // Load reference data once
  useEffect(() => {
    api.reference.balls().then(setBalls);
    api.reference.ribbons().then(setRibbons);
    api.reference.marks().then(setMarks);
    api.legality.gameVersions().then(setGameVersions);
    api.pokemon.completion().then(setGlobalCompletion);
    api.collection.sourceCounts().then(setSourceCounts);
  }, []);

  // Need forms when form categories beyond 'standard' are selected
  const needForms = filters.formCategories.length > 1 ||
    (filters.formCategories.length === 1 && filters.formCategories[0] !== 'standard');

  const load = useCallback(() => {
    api.species.list({ include_forms: needForms || undefined }).then(setSpecies);
    // Load collection entries, falling back to legacy pokemon list
    api.collection.list().then((entries: any[]) => {
      if (entries.length > 0) {
        // Map identity sightings to the shape the filter pipeline expects
        const mapped = entries.map((e: any) => {
          const snap = e.snapshot_data ? (typeof e.snapshot_data === 'string' ? JSON.parse(e.snapshot_data) : e.snapshot_data) : {};
          return {
            species_id: e.species_id,
            level: e.level ?? snap.level,
            is_shiny: snap.is_shiny ? 1 : 0,
            origin_game: snap.origin_game ?? e.game ?? null,
            ball: snap.ball ?? null,
            nature: snap.nature ?? null,
            ability: snap.ability ?? null,
            gender: snap.gender ?? null,
            ribbons: snap.ribbons ?? '[]',
            marks: snap.marks ?? '[]',
            form_id: snap.form ?? null,
            identity_id: e.identity_id,
            is_home: e.is_home,
            nickname: snap.nickname ?? null,
            ot_name: snap.ot_name ?? e.ot_name ?? null,
            ot_tid: snap.ot_tid ?? e.ot_tid ?? null,
            tera_type: snap.tera_type ?? null,
            is_alpha: snap.is_alpha ?? false,
            is_mega: snap.is_mega ?? false,
            source: e.checkpoint_id ? 'save' : (e.bank_file_id ? 'bank' : 'manual'),
          };
        });
        setCollection(mapped);
      } else {
        // Fallback to legacy collection if no identity data exists yet
        api.pokemon.list().then(entries => setCollection(entries.map((e: any) => ({ ...e, source: 'manual' }))));
      }
    }).catch(() => {
      // If identity endpoint fails, fall back to legacy
      api.pokemon.list().then(entries => setCollection(entries.map((e: any) => ({ ...e, source: 'manual' }))));
    });
  }, [needForms]);

  useEffect(load, [load]);

  const refreshCompletion = useCallback(() => {
    api.pokemon.completion().then(setGlobalCompletion);
  }, []);

  const filteredCollection = useMemo(() => {
    return collection.filter((entry: any) => {
      const src = entry.source || 'save';
      return activeSources[src] !== false;
    });
  }, [collection, activeSources]);

  // Build collection maps: species_id -> entries[], form_id -> entries[]
  const collectionMap = useMemo(() => {
    const map = new Map<number, any[]>();
    for (const entry of filteredCollection) {
      const key = entry.species_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return map;
  }, [filteredCollection]);

  const formCollectionMap = useMemo(() => {
    const map = new Map<number, any[]>();
    for (const entry of filteredCollection) {
      if (entry.form_id) {
        if (!map.has(entry.form_id)) map.set(entry.form_id, []);
        map.get(entry.form_id)!.push(entry);
      }
    }
    return map;
  }, [filteredCollection]);

  // Helper: get entries for an item
  const getEntries = useCallback((item: any): any[] => {
    if (item._isFormItem) return formCollectionMap.get(item._formId) || [];
    return collectionMap.get(item.id) || [];
  }, [collectionMap, formCollectionMap]);

  // Main filter pipeline
  const displayItems = useMemo(() => {
    let items: any[];

    // Step a: Expand forms based on formCategories
    const categories = new Set(filters.formCategories);
    if (categories.size <= 1 && categories.has('standard')) {
      // National-only: no form expansion
      items = species.map(s => ({ ...s, _isFormItem: false }));
    } else {
      items = [];
      for (const s of species) {
        if (!s.forms || s.forms.length === 0) {
          items.push({ ...s, _isFormItem: false });
          continue;
        }
        const collectibleForms = s.forms.filter(
          (f: any) => f.is_collectible && categories.has(f.form_category)
        );
        if (collectibleForms.length <= 1) {
          items.push({ ...s, _isFormItem: false });
        } else {
          for (const form of collectibleForms) {
            items.push({
              ...s,
              type1: form.type1,
              type2: form.type2,
              sprite_url: form.sprite_url,
              shiny_sprite_url: form.shiny_sprite_url,
              _isFormItem: true,
              _formId: form.id,
              _formName: form.form_name,
              _formCategory: form.form_category,
              _formOrder: form.form_order,
            });
          }
        }
      }
    }

    // Step b: Search filter
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(item => {
        const nameMatch = item.name.includes(q) || String(item.id).includes(q);
        if (item._isFormItem) {
          return nameMatch || item._formName.toLowerCase().includes(q);
        }
        return nameMatch;
      });
    }

    // Step c: Generation filter
    if (filters.generations.length > 0) {
      const ranges = filters.generations
        .map(g => GEN_RANGE[Number(g)])
        .filter(Boolean);
      items = items.filter(item =>
        ranges.some(([min, max]) => item.id >= min && item.id <= max)
      );
    }

    // Step d: Legality filter — hide species where the selected filter combo is impossible
    // All filters compound: each one narrows what's legally possible.

    // Game + Origin cross-check: if both active, the game must produce at least one
    // of the selected origin marks, otherwise the combo is impossible
    // Build a per-game predicate: prefer species_in_dex membership if loaded
    // for that game (gen 8/9), otherwise fall back to id <= max_species_id.
    const speciesPassesGame = (item: any, game: string): boolean => {
      const slug = GAME_DISPLAY_TO_DEX_SLUG[game];
      const memberSet = slug ? dexMembership[slug] : undefined;
      if (memberSet) return memberSet.has(item.id);
      return item.id <= (gameMaxSpecies[game] ?? 9999);
    };

    if (filters.games.length > 0 && filters.origins.length > 0) {
      const originSet = new Set(filters.origins);
      const compatibleGames = filters.games.filter(g => {
        const mark = gameToOrigin[g];
        return mark && originSet.has(mark);
      });
      if (compatibleGames.length === 0) {
        items = []; // No game produces any of the selected origins
      } else {
        items = items.filter(item => compatibleGames.some(g => speciesPassesGame(item, g)));
      }
    } else if (filters.games.length > 0) {
      // Game filter only: species must exist in at least one selected game
      items = items.filter(item => filters.games.some(g => speciesPassesGame(item, g)));
    } else if (filters.origins.length > 0) {
      // Origin filter only: species must be within max_species_id for at least one selected origin
      const maxIds = filters.origins.map(o => originMaxSpecies[o] ?? 9999);
      items = items.filter(item => maxIds.some(max => item.id <= max));
    }

    // Ball filter: species must have ball_permit that allows at least one selected ball,
    // AND if origin/game filters are active, the ball must be compatible with those too
    if (filters.balls.length > 0) {
      // Compute which of the selected balls are actually possible given origin/game context
      let contextBalls = filters.balls;

      // Origin restricts which balls are legal (e.g. GB = Poke Ball only)
      if (filters.origins.length > 0) {
        const originAllowed = new Set<string>();
        for (const origin of filters.origins) {
          const restricted = ORIGIN_LEGAL_BALLS[origin];
          if (restricted) {
            restricted.forEach(b => originAllowed.add(b));
          } else {
            // null = no restriction, all selected balls are fine for this origin
            filters.balls.forEach(b => originAllowed.add(b));
          }
        }
        contextBalls = contextBalls.filter(b => originAllowed.has(b));
      }

      // Game restricts which balls exist (ball.games includes the game)
      if (filters.games.length > 0 && balls.length > 0) {
        const gameSet = new Set(filters.games);
        const ballsInGames = new Set<string>();
        for (const ball of balls) {
          const ballGames: string[] = typeof ball.games === 'string' ? JSON.parse(ball.games) : ball.games;
          if (ballGames.some(g => gameSet.has(g))) {
            ballsInGames.add(ball.name);
          }
        }
        contextBalls = contextBalls.filter(b => ballsInGames.has(b));
      }

      // If no balls survive the context filter, no species can match
      if (contextBalls.length === 0) {
        items = [];
      } else {
        // Build a bitmask for the wanted balls — O(1) check per species
        const contextSet = new Set(contextBalls);
        let wantMask = 0;
        for (const [bit, names] of Object.entries(BALL_CATEGORIES)) {
          if (names.some(n => contextSet.has(n))) wantMask |= (1 << Number(bit));
        }
        items = items.filter(item => ((item.ball_permit ?? 0) & wantMask) !== 0);
      }
    }

    // Gender: species must be able to have at least one of the selected genders
    if (filters.genders.length > 0) {
      const wantMale = filters.genders.includes('male');
      const wantFemale = filters.genders.includes('female');
      const wantGenderless = filters.genders.includes('genderless');
      items = items.filter(item => {
        const gr = item.gender_rate;
        if (gr === -1) return wantGenderless;
        if (gr === 0) return wantMale;
        if (gr === 8) return wantFemale;
        return wantMale || wantFemale;
      });
    }

    // Ability: species must have at least one of the selected abilities
    if (filters.abilities.length > 0) {
      const abilitySet = new Set(filters.abilities.map(a => a.toLowerCase()));
      items = items.filter(item => {
        const abilities = [item.ability1, item.ability2, item.hidden_ability]
          .filter(Boolean)
          .map((a: string) => a.toLowerCase());
        return abilities.some(a => abilitySet.has(a));
      });
    }

    // Ribbons: species must be able to earn at least one selected ribbon
    // Check: (a) species must exist in a game that has the ribbon
    //        (b) species must not be banned from that ribbon category
    if (filters.ribbons.length > 0 && ribbons.length > 0) {
      const selectedRibbons = ribbons.filter((r: any) =>
        filters.ribbons.includes(String(r.id)) || filters.ribbons.includes(r.name)
      );
      if (selectedRibbons.length > 0) {
        // Collect all games these ribbons are available in
        const ribbonGames = new Set<string>();
        for (const r of selectedRibbons) {
          const rGames: string[] = typeof r.games === 'string' ? JSON.parse(r.games) : r.games;
          rGames.forEach(g => ribbonGames.add(g));
        }
        // Max species from ribbon games
        const maxIds = [...ribbonGames].map(g => gameMaxSpecies[g] ?? 9999);

        // Check if any selected ribbon is battle-facility (bans legends/myths)
        const hasBattleFacility = selectedRibbons.some((r: any) =>
          BATTLE_FACILITY_RIBBON_CATEGORIES.has(r.category)
        );

        items = items.filter(item => {
          // Species must exist in at least one game that has the ribbon
          if (!maxIds.some(max => item.id <= max)) return false;
          // Battle facility ribbons ban legendaries and mythicals
          if (hasBattleFacility && item.category && BATTLE_FACILITY_BANNED.has(item.category)) return false;
          return true;
        });
      }
    }

    // Marks: only wild-caught Pokemon in Gen 8+ games can have marks
    // Check: species must exist in a game that has the selected mark
    if (filters.marks.length > 0 && marks.length > 0) {
      const selectedMarks = marks.filter((m: any) =>
        filters.marks.includes(String(m.id)) || filters.marks.includes(m.name)
      );
      if (selectedMarks.length > 0) {
        // Collect all games these marks are available in
        const markGames = new Set<string>();
        for (const m of selectedMarks) {
          const mGames: string[] = typeof m.games === 'string' ? JSON.parse(m.games) : m.games;
          mGames.forEach(g => markGames.add(g));
        }
        const maxIds = [...markGames].map(g => gameMaxSpecies[g] ?? 9999);

        items = items.filter(item => {
          // Species must exist in at least one game that has this mark
          if (!maxIds.some(max => item.id <= max)) return false;
          // Marks only appear on wild catches — exclude box legendaries and mythicals
          // (sub-legendaries and UBs CAN be wild encounters in Gen 8+, e.g. Galarian birds, CT Ultra Beasts)
          if (item.category && ['legendary', 'mythical'].includes(item.category)) return false;
          return true;
        });

        // If game filter is also active, intersect: game must support marks
        if (filters.games.length > 0) {
          const gameSet = new Set(filters.games);
          if (![...markGames].some(g => gameSet.has(g))) {
            items = [];  // No selected game supports marks
          }
        }
      }
    }

    return items;
  }, [species, search, filters, balls, ribbons, marks, gameToOrigin, gameMaxSpecies, originMaxSpecies, dexMembership]);

  // Collection filters narrow what counts as "caught" — they don't hide cards.
  // An entry must pass ALL active collection filters to count as a "catch."
  function entryMatchesCollectionFilters(e: any): boolean {
    if (filters.games.length > 0) {
      if (!e.origin_game || !new Set(filters.games).has(e.origin_game)) return false;
    }
    if (filters.balls.length > 0) {
      if (!e.ball || !new Set(filters.balls).has(e.ball)) return false;
    }
    if (filters.origins.length > 0) {
      const mark = e.origin_game ? gameToOrigin[e.origin_game] : null;
      if (!mark || !new Set(filters.origins).has(mark)) return false;
    }
    if (filters.genders.length > 0) {
      if (!e.gender || !new Set(filters.genders).has(e.gender)) return false;
    }
    if (filters.ribbons.length > 0) {
      const ribbonSet = new Set(filters.ribbons);
      try {
        const ids = JSON.parse(e.ribbons || '[]');
        if (!ids.some((id: number) => ribbonSet.has(String(id)))) return false;
      } catch { return false; }
    }
    if (filters.marks.length > 0) {
      const markSet = new Set(filters.marks);
      try {
        const ids = JSON.parse(e.marks || '[]');
        if (!ids.some((id: number) => markSet.has(String(id)))) return false;
      } catch { return false; }
    }
    if (filters.abilities.length > 0) {
      if (!e.ability || !new Set(filters.abilities.map(a => a.toLowerCase())).has(e.ability.toLowerCase())) return false;
    }
    return true;
  }

  const hasCollectionFilters = filters.games.length > 0 || filters.balls.length > 0
    || filters.origins.length > 0 || filters.genders.length > 0
    || filters.ribbons.length > 0 || filters.marks.length > 0
    || filters.abilities.length > 0;

  // Build itemCaughtMap — collection filters narrow which entries count as "caught"
  const itemCaughtMap = useMemo(() => {
    const map = new Map<string, { caught: boolean; shinyCaught: boolean }>();
    for (const item of displayItems) {
      const key = item._isFormItem ? `form-${item._formId}` : `${item.id}`;
      let entries = getEntries(item);
      if (hasCollectionFilters) {
        entries = entries.filter(entryMatchesCollectionFilters);
      }
      map.set(key, {
        caught: entries.some(e => !e.is_shiny),
        shinyCaught: entries.some(e => e.is_shiny),
      });
    }
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayItems, getEntries, filters, hasCollectionFilters]);

  // Apply status filter after caught map is computed
  const finalItems = useMemo(() => {
    if (filters.status === 'all') return displayItems;
    const isShiny = filters.mode === 'shiny';
    return displayItems.filter(item => {
      const key = item._isFormItem ? `form-${item._formId}` : `${item.id}`;
      const status = itemCaughtMap.get(key);
      const isCaught = isShiny ? status?.shinyCaught : status?.caught;
      return filters.status === 'caught' ? isCaught : !isCaught;
    });
  }, [displayItems, itemCaughtMap, filters.status, filters.mode]);

  // Count caught for summary
  const caughtCount = useMemo(() => {
    let count = 0;
    for (const [, v] of itemCaughtMap) {
      if (filters.mode === 'shiny' ? v.shinyCaught : v.caught) count++;
    }
    return count;
  }, [itemCaughtMap, filters.mode]);

  const shinyMode = filters.mode === 'shiny';

  const serializeFilters = useCallback((): Record<string, any> => {
    return { ...filters };
  }, [filters]);

  const loadFilters = useCallback((incoming: Record<string, any>) => {
    setFilters(prev => ({ ...prev, ...incoming }));
  }, []);

  return {
    // State
    species,
    collection,
    filters,
    search,
    lens,
    globalCompletion,
    balls,
    ribbons,
    marks,
    sourceCounts,
    activeSources,
    toggleSource,

    // Setters
    setFilters,
    setSearch,
    setLens,

    // Derived
    displayItems,
    finalItems,
    itemCaughtMap,
    caughtCount,
    shinyMode,

    // Actions
    load,
    refreshCompletion,
    serializeFilters,
    loadFilters,
  };
}
