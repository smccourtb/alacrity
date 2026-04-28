import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  BookOpenIcon,
  GamepadIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SettingsIcon,
  SmartphoneIcon,
  SparklesIcon,
} from 'lucide-react';
import Pokedex from './pages/Pokedex';
import HuntDashboard from './pages/HuntDashboard';
import PlayPage from './pages/PlayPage';
import Guide from './pages/Guide';
import CollectionDashboard from './pages/CollectionDashboard';
import Settings from './pages/Settings';
import MobileStream from './pages/MobileStream';
import EncountersMockup from './pages/EncountersMockup';
import SessionMonitor from './components/launcher/SessionMonitor';
import ActiveStreamToast from './components/launcher/ActiveStreamToast';
import { WelcomeDialog } from '@/components/onboarding/WelcomeDialog';

/** Pokeball nav icon — red top half, white bottom, black band + center button */
function PokeballIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      {/* Red top half */}
      <path d="M2.05 11A10 10 0 0 1 21.95 11H15.9A4 4 0 0 0 8.1 11Z" fill="#DC2626" />
      {/* White bottom half */}
      <path d="M2.05 13A10 10 0 0 0 21.95 13H15.9A4 4 0 0 1 8.1 13Z" fill="white" />
      {/* Full circle outline */}
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {/* Center band line */}
      <line x1="2" y1="12" x2="8.1" y2="12" stroke="currentColor" strokeWidth="1.5" />
      <line x1="15.9" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.5" />
      {/* Center button */}
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="white" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

const NAV_ITEMS: { label: string; path: string; icon: React.FC<{ className?: string }> }[] = [
  { label: 'Pokedex', path: '/', icon: SmartphoneIcon },
  { label: 'Shiny Hunt', path: '/hunt', icon: SparklesIcon },
  { label: 'Play', path: '/play', icon: GamepadIcon },
  { label: 'Guide', path: '/guide', icon: BookOpenIcon },
];

function AppSidebar() {
  const location = useLocation();
  const { open, toggleSidebar } = useSidebar();

  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-transparent active:bg-transparent">
              <div className="flex aspect-square size-8 items-center justify-center">
                <PokeballIcon className="size-7" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-bold text-base">Alacrity</span>
                <span className="text-xs opacity-60">Collection Tracker</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(item => (
                <SidebarMenuItem key={item.path}>
                  <NavLink to={item.path} style={{ textDecoration: 'none' }}>
                    <SidebarMenuButton
                      isActive={location.pathname === item.path}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <NavLink to="/settings" style={{ textDecoration: 'none' }}>
              <SidebarMenuButton
                isActive={location.pathname === '/settings'}
                tooltip="Settings"
              >
                <SettingsIcon />
                <span>Settings</span>
              </SidebarMenuButton>
            </NavLink>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleSidebar} tooltip={open ? 'Collapse' : 'Expand'}>
              {open ? <PanelLeftCloseIcon /> : <PanelLeftOpenIcon />}
              <span>Collapse</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          {/* Standalone mobile stream page — no sidebar shell */}
          <Route path="/stream" element={<MobileStream />} />

          {/* Desktop shell with sidebar */}
          <Route path="*" element={
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <header className="flex items-center gap-2 p-4 md:hidden">
                  <SidebarTrigger />
                  <span className="font-bold text-base">Alacrity</span>
                </header>
                <main className="p-6 pt-0 md:pt-6">
                  <Routes>
                    <Route path="/" element={<Pokedex />} />
                    <Route path="/hunt" element={<HuntDashboard />} />
                    <Route path="/play" element={<PlayPage />} />
                    <Route path="/saves" element={<Navigate to="/play" replace />} />
                    <Route path="/guide" element={<Guide />} />
                    <Route path="/collection" element={<CollectionDashboard />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/dev/encounters" element={<EncountersMockup />} />
                  </Routes>
                </main>
              </SidebarInset>
              <SessionMonitor />
              <ActiveStreamToast />
              <WelcomeDialog />
            </SidebarProvider>
          } />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
}
