import { Globe, BookOpen, Compass, Backpack, User } from 'lucide-react';

export type BaseTab = 'explore' | 'field-guide' | 'expedition' | 'inventory' | 'profile';

const TABS: { key: BaseTab; label: string; icon: typeof Globe }[] = [
  { key: 'explore', label: 'Explore', icon: Globe },
  { key: 'field-guide', label: 'Guide', icon: BookOpen },
  { key: 'expedition', label: 'Expedition', icon: Compass },
  { key: 'inventory', label: 'Inventory', icon: Backpack },
  { key: 'profile', label: 'Profile', icon: User },
];

interface BottomTabBarProps {
  active: BaseTab;
  onChange: (tab: BaseTab) => void;
}

export function BottomTabBar({ active, onChange }: BottomTabBarProps) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-[9000]">
      <div className="flex justify-between items-center px-2 py-2 glass-bg border border-ds-subtle rounded-[32px] shadow-ds-card">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`
                relative flex flex-col items-center justify-center w-[72px] h-[64px] transition-all duration-300
                rounded-[20px] overflow-hidden
                ${isActive ? 'bg-ds-cyan/10' : 'hover:bg-white/5'}
              `}
            >
              {/* Active top edge glow */}
              {isActive && (
                <div className="absolute top-0 left-0 w-full h-[2px] bg-ds-cyan shadow-glow-cyan" />
              )}
              <Icon
                size={22}
                className={`mb-1 transition-all duration-300 ${isActive ? 'text-ds-cyan drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]' : 'text-ds-text-muted'}`}
                strokeWidth={isActive ? 2 : 1.5}
                fill={isActive ? 'currentColor' : 'none'}
              />
              <span className={`text-ds-caption tracking-wide transition-colors ${isActive ? 'text-ds-cyan' : 'text-ds-text-muted'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
