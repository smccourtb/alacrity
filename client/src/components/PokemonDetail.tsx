import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import SpeciesDetail from './pokemon/SpeciesDetail';

interface Props {
  species: any;
  onClose: () => void;
  onSave: () => void;
}

export default function PokemonDetail({ species, onClose, onSave }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-[95%] max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-6">
            <SpeciesDetail species={species} onClose={onClose} onSave={onSave} />

            <div className="flex justify-end mt-4">
              <Button variant="ghost" onClick={onClose} className="rounded-full">Close</Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
