/**
 * Parses visible/hidden item and TM placements from pret gen2 maps.
 *
 * Crystal/Gold format:
 *   - Visible itemballs: `object_event X, Y, SPRITE_POKE_BALL, ..., OBJECTTYPE_ITEMBALL, 0, <Label>, EVENT_*`
 *     with `<Label>: itemball ITEM[, QTY]` elsewhere in the same file.
 *   - Hidden items: `bg_event X, Y, BGEVENT_ITEM, <Label>` with
 *     `<Label>: hiddenitem ITEM, EVENT_*`.
 *
 * Gen1 (pokered, pokeyellow) uses different data layouts; returns [] and warns.
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface ParsedItem {
  map_name: string;
  item_name: string;     // pret constant, e.g. POTION, TM_RETURN
  display_name: string;  // humanized, e.g. "Potion", "TM Return"
  method: 'field' | 'hidden' | 'tm' | 'gift';
  tm_number: number | null;
  tile_x: number;
  tile_y: number;
  // Pret EVENT_* flag in `wEventFlags`. Field/hidden items embed it on the
  // object_event/hiddenitem line. Gift items pair with the `setevent EVENT_*`
  // immediately following the `giveitem` in the same script body. Some gifts
  // gate on engine flags instead (see `engine_flag`) or on no flag at all
  // (e.g. Red Scale, gated by EVENT_BEAT_LAKE_OF_RAGE_RED_GYARADOS).
  event_flag: string | null;
  // Pret ENGINE_* flag in `wEngineBuffer` (a separate bank from wEventFlags).
  // Used by Lucky Number Show prizes, Goldenrod 5F happiness TMs, and a few
  // other once-only gifts that don't get their own EVENT_*. Reading this bank
  // requires a separate offset config in flagParsers/index.ts (TODO).
  engine_flag: string | null;
  // Classification of how the game persists "got this item" state. Used by
  // the UI to distinguish "you missed this checkpoint" (one_time) from
  // "this is on a daily cycle" (recurring) from "this is a shop purchase"
  // (transactional). Items with `event_flag`/`engine_flag` are inherently
  // one_time (the flag is the persistence). Items without a flag get this
  // field set to recurring/transactional/scripted based on script structure.
  pickup_kind: 'one_time' | 'recurring' | 'transactional' | 'scripted' | null;
}

export async function parseItemsFromPret(pretRoot: string): Promise<ParsedItem[]> {
  const mapsDir = join(pretRoot, 'maps');
  if (!existsSync(mapsDir)) {
    console.warn(`[item-parser] ${pretRoot}: no maps/ dir, skipping`);
    return [];
  }
  // Heuristic: gen1 has no data/trainers/parties.asm style; skip by checking
  // for the crystal-style macro directory.
  const macrosDir = join(pretRoot, 'macros/scripts');
  if (!existsSync(macrosDir)) {
    console.warn(`[item-parser] ${pretRoot}: looks like gen1, skipping`);
    return [];
  }

  const files = await readdir(mapsDir);
  const out: ParsedItem[] = [];
  for (const f of files) {
    if (!f.endsWith('.asm')) continue;
    const mapName = f.replace(/\.asm$/, '');
    const text = await readFile(join(mapsDir, f), 'utf-8');
    out.push(...dedupByBestFlag(parseOneMap(mapName, text)));
  }
  return out;
}

/**
 * Dedup parsed items per (map, item, method, x, y), keeping the entry with
 * the most specific event_flag. Chained NPC scripts (Kurt's house, Elm's lab)
 * can have one giveitem reachable from multiple triggers — each trigger
 * emits an entry with whatever flag its forward/backward scan found, and one
 * trigger may fall back to its object_event flag (sprite visibility) while
 * another correctly lands on the giveitem-paired setevent. The setevent flag
 * wins because it semantically matches "you got the item."
 */
function dedupByBestFlag(items: ParsedItem[]): ParsedItem[] {
  const seen = new Map<string, ParsedItem>();
  for (const it of items) {
    const key = `${it.map_name}:${it.item_name}:${it.method}:${it.tile_x}:${it.tile_y}`;
    const prev = seen.get(key);
    if (!prev || flagSpecificity(it) > flagSpecificity(prev)) seen.set(key, it);
  }
  return [...seen.values()];
}

// Higher = more specific. Used to pick the "best" flag among multiple
// candidates for the same gift.
function flagSpecificity(it: ParsedItem): number {
  const f = it.event_flag;
  if (!f) return it.engine_flag ? 3 : 0;
  // EVENT_GOT_*  / EVENT_*_GAVE_YOU_* / EVENT_GAVE_KURT_*  — items the script
  // explicitly attributes to player acquisition.
  if (/EVENT_GOT_|_GAVE_YOU_|EVENT_GAVE_/.test(f)) return 10;
  // Hidden-item + named-pickup flags — also action-specific.
  if (/_HIDDEN_|_OBTAINED_|_TAKEN_|_FOUND_|_RECEIVED_/.test(f)) return 9;
  // Trainer-defeat tagged on a story-pokeball object_event (Dragon Fang
  // gating on EVENT_DRAGONS_DEN_B1F_DRAGON_FANG; Red Scale on EVENT_LAKE_OF_RAGE_RED_GYARADOS).
  if (/_DRAGON_FANG|_RED_GYARADOS|_RED_SCALE|_LANCE/.test(f)) return 8;
  // Generic location-tagged event (e.g., ITEM_RECEIVED, KURTS_HOUSE_KURT_1).
  // Less specific than action-named flags.
  return 5;
}

function parseOneMap(mapName: string, text: string): ParsedItem[] {
  // 1. Collect label → item definitions. Hidden items carry their EVENT_* in
  // the macro itself (`hiddenitem ITEM, EVENT_*`); itemballs carry it in the
  // referencing object_event line, so we attach the EVENT later.
  const labelToItem = new Map<string, { item: string; kind: 'field' | 'hidden'; event_flag: string | null }>();

  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const labelMatch = lines[i].match(/^([A-Za-z][A-Za-z0-9_]*):\s*$/);
    if (!labelMatch) continue;
    // peek next non-empty non-comment line
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const body = lines[j].replace(/;.*$/, '').trim();
      if (!body) continue;
      const ib = body.match(/^itemball\s+([A-Z][A-Z0-9_]*)/);
      if (ib) { labelToItem.set(labelMatch[1], { item: ib[1], kind: 'field', event_flag: null }); break; }
      const hi = body.match(/^hiddenitem\s+([A-Z][A-Z0-9_]*)(?:,\s*(EVENT_[A-Z0-9_]+))?/);
      if (hi) { labelToItem.set(labelMatch[1], { item: hi[1], kind: 'hidden', event_flag: hi[2] ?? null }); break; }
      break;
    }
  }

  // 2. Find object_events with OBJECTTYPE_ITEMBALL. The EVENT_* trails the
  // label in the same line — capture it as the source-of-truth flag.
  const out: ParsedItem[] = [];
  const objectRe = /^\s*object_event\s+(-?\d+),\s*(-?\d+),\s*[A-Z0-9_]+,\s*[A-Z0-9_]+,\s*\d+,\s*\d+,\s*-?\d+,\s*-?\d+,\s*[A-Z0-9_]+,\s*OBJECTTYPE_ITEMBALL,\s*\d+,\s*([A-Za-z][A-Za-z0-9_]*),\s*(EVENT_[A-Z0-9_]+)/gm;
  let m;
  while ((m = objectRe.exec(text)) != null) {
    const x = parseInt(m[1], 10);
    const y = parseInt(m[2], 10);
    const label = m[3];
    const eventFlag = m[4];
    const def = labelToItem.get(label);
    if (!def) continue;
    const item = def.item;
    const isTm = /^(TM|HM)/.test(item);
    out.push({
      map_name: mapName,
      item_name: item,
      display_name: humanize(item),
      method: isTm ? 'tm' : 'field',
      tm_number: null, // pret crystal TMs lack an embedded number; orchestrator can resolve later
      tile_x: x,
      tile_y: y,
      event_flag: eventFlag,
      engine_flag: null,
      pickup_kind: 'one_time',
    });
  }

  // 3. Find bg_events with BGEVENT_ITEM. The EVENT_* lives on the hiddenitem
  // macro under the referenced label (collected in step 1).
  const bgRe = /^\s*bg_event\s+(-?\d+),\s*(-?\d+),\s*BGEVENT_ITEM,\s*([A-Za-z][A-Za-z0-9_]*)/gm;
  while ((m = bgRe.exec(text)) != null) {
    const x = parseInt(m[1], 10);
    const y = parseInt(m[2], 10);
    const label = m[3];
    const def = labelToItem.get(label);
    if (!def) continue;
    out.push({
      map_name: mapName,
      item_name: def.item,
      display_name: humanize(def.item),
      method: 'hidden',
      tm_number: null,
      tile_x: x,
      tile_y: y,
      event_flag: def.event_flag,
      engine_flag: null,
      pickup_kind: 'one_time',
    });
  }

  // 4. Gift items dispensed by NPC scripts (verbosegiveitem / giveitem).
  // Map top-level label → body (stops at next top-level label; `.local`
  // sub-labels are included). Then for every non-itemball object_event,
  // grep its script body for gives.
  const labelBodies = new Map<string, string[]>();
  let currentLabel: string | null = null;
  let bodyStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const top = lines[i].match(/^([A-Za-z][A-Za-z0-9_]*):\s*$/);
    if (!top) continue;
    if (currentLabel != null) labelBodies.set(currentLabel, lines.slice(bodyStart, i));
    currentLabel = top[1];
    bodyStart = i + 1;
  }
  if (currentLabel != null) labelBodies.set(currentLabel, lines.slice(bodyStart));

  // Triggers carry an OPTIONAL trailing EVENT_*: object_events of OBJECTTYPE_SCRIPT
  // often have it (Dragon Fang in DragonsDen, story-pokeball variants). When
  // present, that EVENT is the persistence flag set when the trigger fires —
  // we attribute it to any giveitem found in the script body even without a
  // local setevent pairing.
  const triggers: Array<{ x: number; y: number; label: string; objectEvent: string | null }> = [];
  const objRe = /^\s*object_event\s+(-?\d+),\s*(-?\d+),\s*[A-Z0-9_]+,\s*[A-Z0-9_]+,\s*\d+,\s*\d+,\s*-?\d+,\s*-?\d+,\s*[A-Z0-9_]+,\s*(OBJECTTYPE_[A-Z_]+),\s*\d+,\s*([A-Za-z][A-Za-z0-9_]*)(?:,\s*(EVENT_[A-Z0-9_]+|-1))?/gm;
  while ((m = objRe.exec(text)) != null) {
    if (m[3] === 'OBJECTTYPE_ITEMBALL') continue;
    const oe = m[5] && m[5] !== '-1' ? m[5] : null;
    triggers.push({ x: parseInt(m[1], 10), y: parseInt(m[2], 10), label: m[4], objectEvent: oe });
  }
  // coord_events: cutscene triggers on specific tiles. Format:
  //   coord_event X, Y, SCENE_VAR, label
  // followed sometimes by a trailing event id; coord scripts are usually
  // gated by a scene var rather than an event flag, so we don't capture one.
  const coordRe = /^\s*coord_event\s+(-?\d+),\s*(-?\d+),\s*[A-Z0-9_]+,\s*([A-Za-z][A-Za-z0-9_]*)/gm;
  while ((m = coordRe.exec(text)) != null) {
    triggers.push({ x: parseInt(m[1], 10), y: parseInt(m[2], 10), label: m[3], objectEvent: null });
  }
  // bg_events of type BGEVENT_READ (signposts/radios that can gift items).
  const bgReadRe = /^\s*bg_event\s+(-?\d+),\s*(-?\d+),\s*BGEVENT_READ,\s*([A-Za-z][A-Za-z0-9_]*)/gm;
  while ((m = bgReadRe.exec(text)) != null) {
    triggers.push({ x: parseInt(m[1], 10), y: parseInt(m[2], 10), label: m[3], objectEvent: null });
  }

  const seen = new Set<string>();
  // Pret has three flavors of item-giving macros in gen2 maps:
  //   giveitem ITEM[, QTY]
  //   verbosegiveitem ITEM[, QTY]
  //   verbosegiveitemvar ITEM, VAR_NAME    ← Kurt's Apricorn balls in Crystal
  // The `var` variant pulls quantity from a memory var. We match the item
  // constant in all three and let the surrounding setevent/setflag pairing
  // resolve the trackable flag — many of these gifts have no permanent flag
  // by design (the game tracks state via transient buffers, not wEventFlags).
  const giveRe = /^\s*(?:verbose)?giveitem(?:var)?\s+([A-Z_][A-Z0-9_]*)/;
  const setEventRe = /^\s*setevent\s+(EVENT_[A-Z0-9_]+)/;
  const setEngineRe = /^\s*setflag\s+(ENGINE_[A-Z0-9_]+)/;
  // Pret scripts dispatch via top-level labels (iftrue/iffalse/sjump/jump etc).
  // The Elm NPC chains ProfElmScript → ElmCheckMasterBall → ElmGiveMasterBall
  // through three labels — naive single-body inspection misses the gift. Walk
  // the chain transitively, gathering all body lines reachable from each
  // trigger, before running giveitem detection.
  // `scall` invokes a sub-script that returns; treat as a chain edge so gift
  // detection in subscripts is attributed to the calling NPC trigger.
  const chainRe = /^\s*(?:iftrue|iffalse|sjump|jumpstd_if|jumpopenedtext|jump|scall)\s+([A-Za-z][A-Za-z0-9_]*)/;
  function reachableBody(seed: string): string[] {
    const visited = new Set<string>();
    const lines: string[] = [];
    const stack = [seed];
    while (stack.length) {
      const lbl = stack.pop()!;
      if (visited.has(lbl)) continue;
      visited.add(lbl);
      const b = labelBodies.get(lbl);
      if (!b) continue;
      lines.push(...b);
      for (const ln of b) {
        const stripped = ln.replace(/;.*$/, '');
        const m = stripped.match(chainRe);
        if (m) stack.push(m[1]);
      }
    }
    return lines;
  }
  for (const trg of triggers) {
    const body = reachableBody(trg.label);
    if (!body.length) continue;
    for (let li = 0; li < body.length; li++) {
      const ln = body[li].replace(/;.*$/, '');
      const g = ln.match(giveRe);
      if (!g) continue;
      const item = g[1];
      // Pair the giveitem with a nearby `setevent EVENT_*` or
      // `setflag ENGINE_*`. Scripts vary on order — Buena's Blue Card sets
      // `EVENT_MET_BUENA` BEFORE giveitem; Elm's Master Ball sets
      // `EVENT_GOT_MASTER_BALL_FROM_ELM` AFTER. Scan both directions.
      // Forward window stops at the next giveitem (different gift); backward
      // window stops at any prior giveitem to avoid stealing its flag.
      let pairedEventLook: string | null = null;
      let pairedEngineLook: string | null = null;
      // Forward
      for (let lk = li + 1; lk < Math.min(li + 12, body.length); lk++) {
        const lnk = body[lk].replace(/;.*$/, '');
        if (giveRe.test(lnk)) break;
        if (!pairedEventLook) {
          const se = lnk.match(setEventRe);
          if (se) pairedEventLook = se[1];
        }
        if (!pairedEngineLook) {
          const sf = lnk.match(setEngineRe);
          if (sf) pairedEngineLook = sf[1];
        }
        if (pairedEventLook || pairedEngineLook) break;
      }
      // Backward (only if forward didn't find one) — typical pattern is
      // checkevent / iftrue alreadyHad / writetext / setevent / giveitem.
      if (!pairedEventLook && !pairedEngineLook) {
        for (let lk = li - 1; lk >= Math.max(0, li - 6); lk--) {
          const lnk = body[lk].replace(/;.*$/, '');
          if (giveRe.test(lnk)) break;
          if (!pairedEventLook) {
            const se = lnk.match(setEventRe);
            if (se) pairedEventLook = se[1];
          }
          if (!pairedEngineLook) {
            const sf = lnk.match(setEngineRe);
            if (sf) pairedEngineLook = sf[1];
          }
          if (pairedEventLook || pairedEngineLook) break;
        }
      }
      // Last resort: trigger's own object_event EVENT_*. Stories like Dragon
      // Fang, Lance's Dragon Den TM use this — picking up the item triggers
      // a `disappear` and the EVENT_* is what prevents respawn next visit.
      if (!pairedEventLook && !pairedEngineLook && trg.objectEvent) {
        pairedEventLook = trg.objectEvent;
      }
      // With transitive walking, two NPC triggers can reach the same gift
      // sub-script (e.g. Elm's aide from two walk-direction variants both call
      // AideScript_GiveYouBalls). Dedup by (item, flag) so the same gift
      // collapses; unflagged gifts dedup to one row per item per map.
      const dedupKey = `${item}:${pairedEventLook ?? pairedEngineLook ?? '_noflag_'}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
      const isTm = /^(TM|HM)/.test(item);
      const pickupKind = pairedEventLook || pairedEngineLook
        ? 'one_time'
        : classifyUnflaggedGift(body, li, mapName, trg.label);
      out.push({
        map_name: mapName,
        item_name: item,
        display_name: humanize(item),
        method: isTm ? 'tm' : 'gift',
        tm_number: null,
        tile_x: trg.x,
        tile_y: trg.y,
        event_flag: pairedEventLook,
        engine_flag: pairedEngineLook,
        pickup_kind: pickupKind,
      });
    }
  }

  return out;
}

function humanize(constant: string): string {
  return constant
    .split('_')
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Classify an unflagged giveitem using script structure + label conventions.
 *
 * Pret deliberately omits permanent flags from gifts the game models as
 * recurring/transactional/scripted-deterministic. We can read the same signals
 * pret uses internally to pre-classify them so the UI shows the right state.
 *
 * Signals (in order of confidence):
 *   1. `takemoney` near the giveitem        → transactional (shop purchase)
 *   2. `clearevent EVENT_GAVE_KURT_*`        → recurring (Apricorn ball cycle)
 *   3. `randomitem` / `farcall *Random*`    → recurring (RNG'd daily prize)
 *   4. `setscene SCENE_*` only (no flag)     → scripted-once (intro / forced)
 *   5. Trigger label / map naming patterns:
 *      - `*BerryHouse*`, `*BerryTree*`, `Route*Berry*`        → recurring
 *      - `*Mart*`, `*Kiosk*`, `*DeptStore*`, `*Pharmacy*`     → transactional
 *      - `*Pokecenter*` with mail/revive                       → recurring
 *      - `*BugContest*`, `*Daycare*`, `*Lottery*`             → recurring
 *
 * Items that match none of the above stay null (parser logs as unclassified).
 * The linker then surfaces them for manual review — these are usually edge
 * cases worth turning into a curated alias.
 */
function classifyUnflaggedGift(
  body: string[],
  giveLine: number,
  mapName: string,
  triggerLabel: string,
): 'recurring' | 'transactional' | 'scripted' | null {
  // Window for proximity-based detection: ±10 lines from the giveitem.
  const lo = Math.max(0, giveLine - 10);
  const hi = Math.min(body.length, giveLine + 12);
  let hasTakeMoney = false;
  let hasGiveMoney = false;
  let hasTakeItem = false;          // Trade pattern: give X take Y (one-shot)
  let hasKurtClear = false;
  let hasRandomItem = false;
  let hasSetScene = false;
  let hasNpcHasCheck = false;       // checkevent EVENT_<NPC>_HAS_<ITEM>
  let hasNpcEventClear = false;     // clearevent EVENT_<NPC>_<...> (non-Kurt)
  let hasChecktime = false;         // RTC-keyed daily/weekly cycle
  for (let i = lo; i < hi; i++) {
    const ln = body[i].replace(/;.*$/, '');
    if (/\btakemoney\b/.test(ln)) hasTakeMoney = true;
    if (/\bgivemoney\b/.test(ln)) hasGiveMoney = true;
    if (/\btakeitem\b/.test(ln)) hasTakeItem = true;
    if (/clearevent\s+EVENT_GAVE_KURT_/.test(ln)) hasKurtClear = true;
    if (/\b(randomitem|RandomItemRotation)\b/i.test(ln)) hasRandomItem = true;
    if (/\bsetscene\b/.test(ln)) hasSetScene = true;
    // Phone-NPC daily gifts: gated on `EVENT_<NPC>_HAS_<ITEM>` set during a
    // call, cleared after pickup. Wilton (Route 44 fishing rod balls), Wade
    // (Route 31 berries), Beverly (Pokemaniac Larry on Route 43 Nuggets), etc.
    if (/checkevent\s+EVENT_[A-Z0-9_]+_HAS_/.test(ln)) hasNpcHasCheck = true;
    // Day-of-week / time-of-day gating indicates recurring rather than one-shot.
    if (/\bcheck(time|day|hour|week)\b/.test(ln)) hasChecktime = true;
    // Generic NPC clearevent (e.g. EVENT_KENJI_ON_BREAK on Route 45) — the
    // flag toggles each cycle, not a permanent "got it" marker.
    if (/clearevent\s+EVENT_[A-Z0-9_]+/.test(ln) && !/EVENT_GOT_/.test(ln)) hasNpcEventClear = true;
    // `clearflag ENGINE_<NPC>_HAS_*` is the same recurring pattern via the
    // engine bank: phone-NPC daily-gift cycles (Wilton balls on Route 44,
    // Beverly Nuggets on National Park, Jose Star Piece on Route 27, etc).
    if (/clearflag\s+ENGINE_[A-Z0-9_]+_(HAS|READY|ON|FINISHED)/.test(ln)) hasNpcEventClear = true;
  }

  // Trade pattern (give X take Y): one-time but no flag — UI should treat
  // this as scripted (you can only do it once because you give up an item).
  // `takeitem` near giveitem AND no money exchange is the signal.
  if (hasTakeItem && !hasTakeMoney && !hasGiveMoney) return 'scripted';
  if (hasTakeMoney || hasGiveMoney) return 'transactional';
  if (hasKurtClear || hasRandomItem || hasNpcHasCheck || hasNpcEventClear || hasChecktime) return 'recurring';

  // Map / label name conventions. Match against both the pret map filename
  // (e.g. `GoldenrodPokecenter1F`, `Route31`) and the script trigger label
  // (`Route30BerryHouseKurtsApprenticeScript`, etc.).
  const corpus = `${mapName} ${triggerLabel}`;
  if (/Berry(?:Tree|House)?|BerryHouse|BerryTree/.test(corpus)) return 'recurring';
  if (/Pokecenter\b/.test(mapName) && /Mail|Revive/i.test(triggerLabel)) return 'recurring';
  if (/BugContest|Daycare|DayCare|Lottery|GameCorner/.test(corpus)) return 'recurring';
  if (/Mart\d?F?\b|Kiosk|DeptStore|Pharmacy|Vendor/.test(corpus)) return 'transactional';

  // ElmsLab intro-script gifts (Potion, Poké Balls): given deterministically
  // during the forced opening sequence. There's no flag because there's no
  // way to skip the gift — the game guarantees you get them as part of the
  // starter cutscene. Match by map name + scene presence.
  if (mapName === 'ElmsLab' && hasSetScene) return 'scripted';

  return null;
}
