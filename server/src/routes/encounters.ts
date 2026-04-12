import { Router } from 'express';
import pokeApi from '../services/pokeApi.js';

const router = Router();

interface EncounterEntry {
  species_id: number;
  name: string;
  method: string;
  min_level: number;
  max_level: number;
  chance: number;
  conditions: string[];
}

function parseIdFromUrl(url: string): number {
  const parts = url.replace(/\/$/, '').split('/');
  return parseInt(parts[parts.length - 1], 10);
}

router.get('/location-area/:name', async (req, res) => {
  const { name } = req.params;
  const game = (req.query.game as string)?.toLowerCase();

  if (!game) {
    return res.status(400).json({ error: 'game query param required' });
  }

  try {
    const area = await pokeApi.getLocationAreaByName(name);

    const entries: EncounterEntry[] = [];

    for (const pe of area.pokemon_encounters) {
      for (const vd of pe.version_details) {
        if (vd.version.name !== game) continue;

        const byMethod = new Map<string, { chances: number[]; minLevels: number[]; maxLevels: number[]; conditions: Set<string> }>();

        for (const ed of vd.encounter_details) {
          const method = ed.method.name;
          if (!byMethod.has(method)) {
            byMethod.set(method, { chances: [], minLevels: [], maxLevels: [], conditions: new Set() });
          }
          const group = byMethod.get(method)!;
          group.chances.push(ed.chance);
          group.minLevels.push(ed.min_level);
          group.maxLevels.push(ed.max_level);
          for (const cv of ed.condition_values) {
            group.conditions.add(cv.name);
          }
        }

        for (const [method, group] of byMethod) {
          entries.push({
            species_id: parseIdFromUrl(pe.pokemon.url),
            name: pe.pokemon.name,
            method,
            min_level: Math.min(...group.minLevels),
            max_level: Math.max(...group.maxLevels),
            chance: group.chances.reduce((a, b) => a + b, 0),
            conditions: Array.from(group.conditions),
          });
        }
      }
    }

    entries.sort((a, b) => b.chance - a.chance);

    res.json(entries);
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return res.status(404).json({ error: `Location area '${name}' not found` });
    }
    console.error('Encounter fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch encounter data' });
  }
});

export default router;
