import L from 'leaflet';

// Pin-style markers with drop shadows and distinct shapes per location type
const SHAPES: Record<string, (color: string, stroke: string) => string> = {
  city: (color, stroke) =>
    `<circle cx="14" cy="12" r="8" fill="${color}" stroke="${stroke}" stroke-width="1.5"/>
     <circle cx="14" cy="12" r="3" fill="${stroke}" opacity="0.6"/>`,
  route: (color, stroke) =>
    `<circle cx="14" cy="12" r="7" fill="none" stroke="${color}" stroke-width="2.5"/>
     <circle cx="14" cy="12" r="2.5" fill="${color}"/>`,
  cave: (color, stroke) =>
    `<polygon points="14,4 23,20 5,20" fill="${color}" stroke="${stroke}" stroke-width="1.5"/>`,
  building: (color, stroke) =>
    `<rect x="6" y="5" width="16" height="14" rx="2" fill="${color}" stroke="${stroke}" stroke-width="1.5"/>
     <rect x="10" y="9" width="3" height="3" rx="0.5" fill="${stroke}" opacity="0.4"/>
     <rect x="15" y="9" width="3" height="3" rx="0.5" fill="${stroke}" opacity="0.4"/>`,
  water: (color, stroke) =>
    `<circle cx="14" cy="11" r="7" fill="${color}" stroke="${stroke}" stroke-width="1.5"/>
     <path d="M7,15 Q10.5,12 14,15 Q17.5,12 21,15" fill="none" stroke="${stroke}" stroke-width="1.5" opacity="0.5"/>`,
  legendary: (color, stroke) =>
    `<polygon points="14,2 17,9 24,9 18.5,13.5 20.5,21 14,17 7.5,21 9.5,13.5 4,9 11,9" fill="${color}" stroke="${stroke}" stroke-width="1"/>`,
  dungeon: (color, stroke) =>
    `<polygon points="14,3 24,12 14,21 4,12" fill="${color}" stroke="${stroke}" stroke-width="1.5"/>
     <circle cx="14" cy="12" r="2.5" fill="${stroke}" opacity="0.4"/>`,
};

const SIZE_MAP: Record<string, number> = {
  city: 36,
  route: 28,
  cave: 32,
  building: 30,
  water: 30,
  legendary: 36,
  dungeon: 32,
};

interface MarkerIconOptions {
  locationType: string;
  color: string;
  strokeColor?: string;
  opacity?: number;
  active?: boolean;
  highlighted?: boolean;
  badge?: { done: number; total: number } | null;
}

export function createMarkerIcon(options: MarkerIconOptions): L.DivIcon {
  const { locationType, color, strokeColor = '#fff', opacity = 1, active = false, highlighted = false } = options;
  const shapeFn = SHAPES[locationType] || SHAPES.city;
  const baseSize = SIZE_MAP[locationType] || 28;
  const emphasized = active || highlighted;
  const size = emphasized ? baseSize + 4 : baseSize;
  const shape = shapeFn(color, strokeColor);

  // Drop shadow filter
  const shadow = `<defs><filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000" flood-opacity="0.35"/>
  </filter></defs>`;

  const badgeSvg = options.badge && options.badge.total > 0
    ? (() => {
      const { done, total } = options.badge;
      const text = `${done}/${total}`;
      const badgeColor = done === total ? '#22c55e' : done > 0 ? '#fb923c' : '#64748b';
      const bw = Math.max(text.length * 4.5 + 6, 20);
      return `<g transform="translate(${14 - bw/2}, -6)">
        <rect x="0" y="0" width="${bw}" height="11" rx="5.5" fill="${badgeColor}" stroke="#fff" stroke-width="0.8"/>
        <text x="${bw/2}" y="8.5" text-anchor="middle" font-size="7" fill="#fff" font-weight="bold" font-family="system-ui">${text}</text>
      </g>`;
    })()
    : '';

  const svg = `<svg viewBox="0 0 28 24" width="${size}" height="${size}" style="opacity:${opacity};overflow:visible">
    ${shadow}
    <g filter="url(#shadow)">${shape}</g>
    ${emphasized ? `<circle cx="14" cy="12" r="${baseSize / 2 + 2}" fill="none" stroke="${color}" stroke-width="2" opacity="0.4"/>` : ''}
    ${badgeSvg}
  </svg>`;

  return L.divIcon({
    html: svg,
    className: 'marker-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
