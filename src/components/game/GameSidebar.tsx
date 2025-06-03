import { useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Globe, 
  Gamepad2, 
  BarChart3, 
  Menu, 
  Settings,
  X,
  Volume2,
  Music
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: any;
  href: string;
  description: string;
}

const navItems: NavItem[] = [
  {
    id: 'map',
    label: 'World Map',
    icon: Globe,
    href: '/game/map',
    description: 'Explore habitats around the world'
  },
  {
    id: 'play',
    label: 'Play Game',
    icon: Gamepad2,
    href: '/game/play',
    description: 'Match species in their habitats'
  },
  {
    id: 'home',
    label: 'My Progress',
    icon: BarChart3,
    href: '/game/home',
    description: 'View your discoveries and stats'
  }
];

export function GameSidebar() {
  const router = useRouter();
  const pathname = router.pathname;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [soundVolume, setSoundVolume] = useState(70);
  const [musicVolume, setMusicVolume] = useState(50);

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  return (
    <>
      {/* Mobile Navigation - Fixed Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50">
        <div className="flex items-center justify-around p-2">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              className={cn(
                "flex flex-col items-center gap-1 h-auto py-2 px-3",
                pathname === item.href && "bg-accent"
              )}
              onClick={() => handleNavigation(item.href)}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </Button>
          ))}
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex flex-col items-center gap-1 h-auto py-2 px-3"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          >
            <Settings className="h-5 w-5" />
            <span className="text-xs">Settings</span>
          </Button>
        </div>
      </div>

      {/* Mobile Settings Panel */}
      {isSettingsOpen && (
        <div className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
          <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Game Settings</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSettingsOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <GameSettings 
              soundVolume={soundVolume}
              setSoundVolume={setSoundVolume}
              musicVolume={musicVolume}
              setMusicVolume={setMusicVolume}
            />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 h-screen bg-muted/40 border-r">
        <div className="p-4">
          <h2 className="text-lg font-semibold">Habitat Match</h2>
          <p className="text-sm text-muted-foreground">Discover species worldwide</p>
        </div>
        <nav className="flex-1 p-2">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant={pathname === item.href ? "secondary" : "ghost"}
              className="w-full justify-start mb-1 h-auto py-3"
              onClick={() => handleNavigation(item.href)}
            >
              <item.icon className="h-4 w-4 mr-3" />
              <div className="text-left">
                <div className="font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">
                  {item.description}
                </div>
              </div>
            </Button>
          ))}
        </nav>
        <div className="p-4 border-t">
          <h3 className="text-sm font-semibold mb-3">Settings</h3>
          <GameSettings 
            soundVolume={soundVolume}
            setSoundVolume={setSoundVolume}
            musicVolume={musicVolume}
            setMusicVolume={setMusicVolume}
          />
        </div>
      </aside>
    </>
  );
}

// Game Settings Component
interface GameSettingsProps {
  soundVolume: number;
  setSoundVolume: (volume: number) => void;
  musicVolume: number;
  setMusicVolume: (volume: number) => void;
}

function GameSettings({ soundVolume, setSoundVolume, musicVolume, setMusicVolume }: GameSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4" />
          <label className="text-sm font-medium">Sound Effects</label>
        </div>
        <input 
          type="range" 
          className="w-full" 
          value={soundVolume}
          onChange={(e) => setSoundVolume(Number(e.target.value))}
          min="0"
          max="100"
        />
        <span className="text-xs text-muted-foreground">{soundVolume}%</span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Music className="h-4 w-4" />
          <label className="text-sm font-medium">Music Volume</label>
        </div>
        <input 
          type="range" 
          className="w-full" 
          value={musicVolume}
          onChange={(e) => setMusicVolume(Number(e.target.value))}
          min="0"
          max="100"
        />
        <span className="text-xs text-muted-foreground">{musicVolume}%</span>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Difficulty</label>
        <select className="w-full p-2 border rounded text-sm">
          <option>Easy</option>
          <option>Medium</option>
          <option>Hard</option>
        </select>
      </div>
    </div>
  );
}