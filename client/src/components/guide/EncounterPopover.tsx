import { useEffect, useState } from 'react';
import { Popup } from 'react-leaflet';
import { api } from '@/api/client';

interface EncounterPopoverProps {
  locationId: number;
  locationName: string;
  game: string;
  position: [number, number];
}

export default function EncounterPopover({ locationId, locationName, game, position }: EncounterPopoverProps) {
  const [encounters, setEncounters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.guide.encounters(locationId, game)
      .then(setEncounters)
      .finally(() => setLoading(false));
  }, [locationId, game]);

  return (
    <Popup position={position} maxWidth={320} minWidth={240}>
      <div className="font-sans">
        <h3 className="font-bold text-sm mb-2">{locationName}</h3>
        {loading ? (
          <p className="text-xs text-gray-500">Loading...</p>
        ) : encounters.length === 0 ? (
          <p className="text-xs text-gray-500">No encounter data for this location.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Pokemon</th>
                <th className="text-left py-1">Method</th>
                <th className="text-right py-1">Rate</th>
                <th className="text-right py-1">Lv</th>
              </tr>
            </thead>
            <tbody>
              {encounters.map((enc, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1 flex items-center gap-1">
                    {enc.sprite_url && <img src={enc.sprite_url} alt="" className="w-4 h-4 pixelated" />}
                    <span className="capitalize">{enc.species_name?.replace('-', ' ')}</span>
                  </td>
                  <td className="py-1 capitalize">{enc.method}</td>
                  <td className="py-1 text-right">{enc.encounter_rate}%</td>
                  <td className="py-1 text-right">{enc.level_min}-{enc.level_max}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {encounters.some(e => e.notes) && (
          <div className="mt-2 text-xs text-gray-500">
            {encounters.filter(e => e.notes).map((e, i) => (
              <div key={i}>{e.species_name}: {e.notes}</div>
            ))}
          </div>
        )}
      </div>
    </Popup>
  );
}
