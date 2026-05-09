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
    <nav
      aria-label="Main navigation"
      className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-md z-tab-bar"
      style={{ bottom: 'max(10px, env(safe-area-inset-bottom, 0px))', zIndex: 5000 }}
    >
      <div className="flex justify-between items-center px-2 py-2 border border-white/10 rounded-[28px] bg-[#101827]/88 backdrop-blur-xl shadow-[0_16px_42px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              aria-current={isActive ? 'page' : undefined}
              aria-label={label}
              onClick={() => onChange(key)}
              className={`
                relative flex flex-col items-center justify-center flex-1 min-w-0 h-[64px] transition-all duration-300
                rounded-[18px] overflow-hidden focus-visible:outline-2 focus-visible:outline-ds-cyan focus-visible:outline-offset-2
                ${isActive ? '' : 'hover:bg-white/5'}
              `}
            >
              <Icon
                size={24}
                className={`mb-1 transition-all duration-300 ${isActive ? 'text-ds-cyan drop-shadow-[0_0_12px_rgba(34,211,238,0.9)]' : 'text-ds-text-muted'}`}
                strokeWidth={isActive ? 2 : 1.5}
              />
              <span className={`text-ds-caption tracking-wide transition-colors ${isActive ? 'text-ds-cyan' : 'text-ds-text-muted'}`}>
                {label}
              </span>
              {isActive && (
                <span className="absolute bottom-1.5 size-1.5 rounded-full bg-ds-cyan shadow-glow-cyan" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
