import L from 'leaflet';

export type SubMarkerType = 'item' | 'hidden_item' | 'trainer' | 'tm' | 'event';

const SUB_SHAPES: Record<SubMarkerType, (fill: string) => string> = {
  item: (fill) =>
    `<circle cx="8" cy="8" r="5.5" fill="${fill}" stroke="#fff" stroke-width="1.5"/>`,
  hidden_item: (fill) =>
    `<circle cx="8" cy="8" r="5.5" fill="${fill}" stroke="#fff" stroke-width="1.5" stroke-dasharray="2 1.5"/>`,
  trainer: (fill) =>
    `<rect x="3" y="3" width="10" height="10" rx="2.5" fill="${fill}" stroke="#fff" stroke-width="1.5"/>`,
  tm: (fill) =>
    `<circle cx="8" cy="8" r="5.5" fill="${fill}" stroke="#fff" stroke-width="1.5"/>
     <text x="8" y="10.5" text-anchor="middle" font-size="5.5" fill="#fff" font-weight="bold" font-family="system-ui">TM</text>`,
  event: (fill) =>
    `<polygon points="8,1.5 9.8,5.8 14.5,5.8 10.7,8.7 12.2,13.5 8,10.8 3.8,13.5 5.3,8.7 1.5,5.8 6.2,5.8" fill="${fill}" stroke="#fff" stroke-width="0.8"/>`,
};

export const SUB_MARKER_COLORS: Record<SubMarkerType, string> = {
  item: '#facc15',
  hidden_item: '#f87171',
  trainer: '#60a5fa',
  tm: '#a78bfa',
  event: '#34d399',
};

const COMPLETED_COLOR = '#4ade80';

interface SubMarkerIconOptions {
  markerType: SubMarkerType;
  completed?: boolean;
  active?: boolean;
}

export function createSubMarkerIcon(options: SubMarkerIconOptions): L.DivIcon {
  const { markerType, completed = false, active = false } = options;
  const fill = completed ? COMPLETED_COLOR : SUB_MARKER_COLORS[markerType];
  const shapeFn = SUB_SHAPES[markerType];
  const shape = shapeFn(fill);

  const checkmark = completed
    ? `<path d="M5 8.5L7 10.5L11 6" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/>`
    : '';

  // Outer circle provides hover/click surface area
  const outerR = active ? 12 : 10;
  const outerSize = outerR * 2 + 4;
  const offset = (outerSize - 16) / 2;

  const svg = `<svg viewBox="${-offset} ${-offset} ${outerSize} ${outerSize}" width="${outerSize}" height="${outerSize}" style="opacity:${completed && !active ? 0.3 : 1};overflow:visible;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4))">
    <circle cx="8" cy="8" r="${outerR}" fill="rgba(255,255,255,0.85)" stroke="${fill}" stroke-width="${active ? 2 : 1}"/>
    ${shape}${checkmark}
    ${active ? `<circle cx="8" cy="8" r="${outerR + 3}" fill="none" stroke="${fill}" stroke-width="1.5" opacity="0.4"/>` : ''}
  </svg>`;

  return L.divIcon({
    html: svg,
    className: 'marker-icon sub-marker-icon',
    iconSize: [outerSize, outerSize],
    iconAnchor: [outerSize / 2, outerSize / 2],
  });
}
