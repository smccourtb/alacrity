import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';

export function WelcomeDialog() {
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.config.get().then((c) => {
      if (!c.welcomeDismissed) setOpen(true);
    }).catch(() => {});
  }, []);

  const dismiss = async (navigateToSettings: boolean) => {
    if (dontShowAgain) {
      await api.config.update({ welcomeDismissed: true }).catch(() => {});
    }
    setOpen(false);
    if (navigateToSettings) navigate('/settings');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && dismiss(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to Alacrity</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>Your shiny hunting + collection tracker.</p>
          <p>
            Alacrity works out of the box as a Pokédex, collection tracker, and
            walkthrough source. If you also want to play or hunt Pokémon, you&apos;ll
            need to set up a few emulators first.
          </p>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-2">
          <div className="flex items-center gap-2 flex-1">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(v) => setDontShowAgain(v === true)}
            />
            <label htmlFor="dont-show-again" className="text-xs text-muted-foreground cursor-pointer">
              Don&apos;t show this again
            </label>
          </div>
          <Button variant="ghost" size="sm" onClick={() => dismiss(false)}>
            Skip for now
          </Button>
          <Button size="sm" onClick={() => dismiss(true)}>
            Set up emulators
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
