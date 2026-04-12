import { BallIcon, GamePill } from '@/components/icons';
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface Props {
  entries: any[];
  selectedId: string | number | null;
  onSelect: (id: string | number) => void;
  onAdd: () => void;
}

export default function EntrySidebar({ entries, selectedId, onSelect, onAdd }: Props) {
  const { toggleSidebar, open } = useSidebar();

  return (
    <Sidebar
      collapsible="icon"
      className="!h-auto !relative !w-auto !border-r-0 [&>div]:!border-r-0"
      style={{
        '--sidebar': 'oklch(1 0 0)',
        '--sidebar-foreground': 'oklch(0.18 0.02 20)',
        '--sidebar-accent': 'oklch(0.95 0.01 20)',
        '--sidebar-accent-foreground': 'oklch(0.25 0.02 20)',
        '--sidebar-border': 'oklch(0.88 0.015 20)',
      } as React.CSSProperties}
    >
      <div className="bg-white rounded-xl shadow-soft-sm overflow-hidden m-1">
        <SidebarHeader className="flex-row items-center justify-between p-2 pb-0">
          {open && (
            <span className="text-xs font-bold text-muted-foreground/50 uppercase tracking-wider px-1">
              Collection ({entries.length})
            </span>
          )}
          <Button
            variant="outline"
            size="icon-sm"
            onClick={toggleSidebar}
            className={`h-6 w-6 border-muted-foreground/20 text-muted-foreground/60 hover:text-foreground ${!open ? 'mx-auto' : ''}`}
          >
            {open ? <PanelLeftCloseIcon className="h-3.5 w-3.5" /> : <PanelLeftOpenIcon className="h-3.5 w-3.5" />}
          </Button>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="gap-1">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {entries.map(entry => {
                  const isShiny = !!entry.is_shiny;
                  const isSelected = entry.id === selectedId;
                  const displayName = entry.nickname || capitalize(entry.species_name || 'Pokemon');

                  return (
                    <SidebarMenuItem key={entry.id}>
                      <SidebarMenuButton
                        size="lg"
                        isActive={isSelected}
                        onClick={() => onSelect(entry.id)}
                        tooltip={`${displayName} Lv.${entry.level || '?'}`}
                        className={`rounded-lg ${isShiny && !isSelected ? 'bg-amber-50/50' : ''}`}
                      >
                        {/* Icon: sprite with ball badge */}
                        <div className="relative flex-shrink-0">
                          <img
                            src={isShiny ? entry.shiny_sprite_url || '' : entry.sprite_url || ''}
                            alt=""
                            className="w-8 h-8 [image-rendering:pixelated]"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          {entry.ball && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5">
                              <BallIcon name={entry.ball} size="sm" />
                            </div>
                          )}
                        </div>
                        {/* Text: name, level, game — hidden when collapsed (handled by SidebarMenuButton truncation) */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate text-foreground">
                            {displayName}
                            {isShiny && <span className="text-amber-500 ml-1">✦</span>}
                            <span className="text-muted-foreground/40 font-normal ml-1">Lv.{entry.level || '?'}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {entry.origin_game && <GamePill game={entry.origin_game} size="sm" />}
                          </div>
                        </div>
                      </SidebarMenuButton>
                      {open && entry.source === 'auto' && (
                        <SidebarMenuBadge className="text-2xs bg-green-100 text-green-600">Auto</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}

                {/* Add button */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    size="lg"
                    onClick={onAdd}
                    tooltip="Add entry"
                    className="rounded-lg border border-dashed border-muted-foreground/15 text-muted-foreground/30 hover:border-primary/40 hover:text-primary/60"
                  >
                    <div className="flex items-center justify-center w-8 h-8 text-lg flex-shrink-0">+</div>
                    {open && <span className="text-sm font-semibold">Add Entry</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </div>
    </Sidebar>
  );
}
