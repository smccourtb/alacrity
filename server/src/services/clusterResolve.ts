import db from '../db.js';

export interface ResolvedCluster {
  id: number;
  kind: 'proximity' | 'location_aggregate';
  x: number;
  y: number;
  primary: { marker_type: string; reference_id: number };
  member_ids: Array<{ marker_type: string; reference_id: number }>;
  hide_members: boolean;
  count: number;
}

interface FlatMarker {
  marker_type: string;
  reference_id: number;
  x: number | null;
  y: number | null;
  location_id: number | null;
}

export function resolveClustersForMap(mapKey: string, flatMarkers: FlatMarker[]): ResolvedCluster[] {
  const out: ResolvedCluster[] = [];

  // Only persisted clusters — proximity auto-grouping was removed because it
  // was grouping visually-distinct markers. Users create groups explicitly via
  // the "Group with…" action or a location-aggregate pin.
  const persisted = db.prepare(`
    SELECT id, kind, scope_location_id, x, y,
           primary_marker_type, primary_reference_id, hide_members
    FROM marker_clusters WHERE map_key = ?`).all(mapKey) as any[];

  const memberStmt = db.prepare(`
    SELECT marker_type, reference_id FROM marker_cluster_members WHERE cluster_id = ?`);

  for (const c of persisted) {
    const primary = { marker_type: c.primary_marker_type, reference_id: c.primary_reference_id };
    let members: Array<{ marker_type: string; reference_id: number }>;
    if (c.kind === 'location_aggregate') {
      // A null scope would match every marker whose location_id is null
      // (custom markers, connections, etc). Treat that as an invalid cluster.
      if (c.scope_location_id == null) continue;
      members = flatMarkers
        .filter(m => m.location_id === c.scope_location_id)
        .map(m => ({ marker_type: m.marker_type, reference_id: m.reference_id }));
      if (!members.some(m => m.marker_type === primary.marker_type && m.reference_id === primary.reference_id)) {
        members.unshift(primary);
      }
    } else {
      members = memberStmt.all(c.id) as any[];
      if (!members.some(m => m.marker_type === primary.marker_type && m.reference_id === primary.reference_id)) {
        members.unshift(primary);
      }
    }
    let x = c.x, y = c.y;
    if (c.kind === 'proximity') {
      const p = flatMarkers.find(m =>
        m.marker_type === primary.marker_type && m.reference_id === primary.reference_id);
      if (!p || p.x == null || p.y == null) continue;
      x = p.x; y = p.y;
    }
    if (x == null || y == null) continue;

    out.push({
      id: c.id,
      kind: c.kind,
      x, y,
      primary,
      member_ids: members,
      hide_members: !!c.hide_members,
      count: members.length,
    });
  }

  return out;
}
