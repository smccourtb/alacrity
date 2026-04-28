import db from '../db.js';

export type IdentityKey = string;

/**
 * Stable key for seed JSON round-trip:
 *   seeded: "<location_key>:<marker_type>:<name>"
 *     - trainer name = trainer_class + ' ' + trainer_name  (matches /markers GET)
 *     - item  name  = item_name + '|' + (method ?? '')
 *     - tm    name  = 'TM' + zero-padded tm_number
 *     - event name  = event_name
 *     - shop  name  = shop_name
 *   custom: "custom:<natural_id>"
 */
export function keyForMarker(markerType: string, referenceId: number): IdentityKey | null {
  if (markerType === 'trainer') {
    const r = db.prepare(`
      SELECT lt.trainer_class, lt.trainer_name, ml.location_key
      FROM location_trainers lt JOIN map_locations ml ON ml.id = lt.location_id
      WHERE lt.id = ?`).get(referenceId) as any;
    if (!r) return null;
    return `${r.location_key}:trainer:${r.trainer_class} ${r.trainer_name}`;
  }
  if (markerType === 'item' || markerType === 'hidden_item') {
    const r = db.prepare(`
      SELECT li.item_name, li.method, ml.location_key
      FROM location_items li JOIN map_locations ml ON ml.id = li.location_id
      WHERE li.id = ?`).get(referenceId) as any;
    if (!r) return null;
    return `${r.location_key}:${markerType}:${r.item_name}|${r.method ?? ''}`;
  }
  if (markerType === 'tm') {
    const r = db.prepare(`
      SELECT ltm.tm_number, ml.location_key
      FROM location_tms ltm JOIN map_locations ml ON ml.id = ltm.location_id
      WHERE ltm.id = ?`).get(referenceId) as any;
    if (!r) return null;
    return `${r.location_key}:tm:TM${String(r.tm_number).padStart(2, '0')}`;
  }
  if (markerType === 'event') {
    const r = db.prepare(`
      SELECT le.event_name, ml.location_key
      FROM location_events le JOIN map_locations ml ON ml.id = le.location_id
      WHERE le.id = ?`).get(referenceId) as any;
    if (!r) return null;
    return `${r.location_key}:event:${r.event_name}`;
  }
  if (markerType === 'shop') {
    const r = db.prepare(`
      SELECT ls.shop_name, ml.location_key
      FROM location_shops ls JOIN map_locations ml ON ml.id = ls.location_id
      WHERE ls.id = ?`).get(referenceId) as any;
    if (!r) return null;
    return `${r.location_key}:shop:${r.shop_name}`;
  }
  if (markerType === 'custom') {
    const r = db.prepare('SELECT natural_id FROM custom_markers WHERE id = ?').get(referenceId) as any;
    if (!r) return null;
    return `custom:${r.natural_id}`;
  }
  return null;
}

/** Reverse: resolve an identity key back to (marker_type, reference_id). Returns null if unresolvable. */
export function resolveKey(key: IdentityKey): { marker_type: string; reference_id: number } | null {
  if (key.startsWith('custom:')) {
    const natId = key.slice('custom:'.length);
    const r = db.prepare('SELECT id FROM custom_markers WHERE natural_id = ?').get(natId) as any;
    return r ? { marker_type: 'custom', reference_id: r.id } : null;
  }
  const [locationKey, markerType, ...rest] = key.split(':');
  const tail = rest.join(':');
  if (markerType === 'trainer') {
    // tail = "<trainer_class> <trainer_name>" — match by concatenation
    const r = db.prepare(`
      SELECT lt.id FROM location_trainers lt
      JOIN map_locations ml ON ml.id = lt.location_id
      WHERE ml.location_key = ? AND (lt.trainer_class || ' ' || lt.trainer_name) = ?`)
      .get(locationKey, tail) as any;
    return r ? { marker_type: 'trainer', reference_id: r.id } : null;
  }
  if (markerType === 'item' || markerType === 'hidden_item') {
    const [item_name, method] = tail.split('|');
    const r = db.prepare(`
      SELECT li.id FROM location_items li
      JOIN map_locations ml ON ml.id = li.location_id
      WHERE ml.location_key = ? AND li.item_name = ? AND COALESCE(li.method, '') = ?`)
      .get(locationKey, item_name, method ?? '') as any;
    return r ? { marker_type: markerType, reference_id: r.id } : null;
  }
  if (markerType === 'tm') {
    const num = Number(tail.replace(/^TM/, ''));
    const r = db.prepare(`
      SELECT ltm.id FROM location_tms ltm
      JOIN map_locations ml ON ml.id = ltm.location_id
      WHERE ml.location_key = ? AND ltm.tm_number = ?`)
      .get(locationKey, num) as any;
    return r ? { marker_type: 'tm', reference_id: r.id } : null;
  }
  if (markerType === 'event') {
    const r = db.prepare(`
      SELECT le.id FROM location_events le
      JOIN map_locations ml ON ml.id = le.location_id
      WHERE ml.location_key = ? AND le.event_name = ?`)
      .get(locationKey, tail) as any;
    return r ? { marker_type: 'event', reference_id: r.id } : null;
  }
  if (markerType === 'shop') {
    const r = db.prepare(`
      SELECT ls.id FROM location_shops ls
      JOIN map_locations ml ON ml.id = ls.location_id
      WHERE ml.location_key = ? AND ls.shop_name = ?`)
      .get(locationKey, tail) as any;
    return r ? { marker_type: 'shop', reference_id: r.id } : null;
  }
  return null;
}
