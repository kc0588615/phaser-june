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
      <div className="flex justify-between items-center px-2 py-2 bg-[#0a1420]/75 backdrop-blur-xl border border-white/5 rounded-[32px] shadow-2xl shadow-cyan-900/20">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`
                relative flex flex-col items-center justify-center w-[72px] h-[64px] transition-all duration-300
                rounded-[20px] overflow-hidden
                ${isActive ? 'bg-cyan-500/10' : 'hover:bg-white/5'}
              `}
            >
              {/* Active top edge glow */}
              {isActive && (
                <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-300 shadow-[0_2px_12px_rgba(34,211,238,1)]" />
              )}
              <Icon
                size={22}
                className={`mb-1 transition-all duration-300 ${isActive ? 'text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]' : 'text-slate-400'}`}
                strokeWidth={isActive ? 2 : 1.5}
                fill={isActive ? 'currentColor' : 'none'}
              />
              <span className={`text-[11px] font-medium tracking-wide transition-colors ${isActive ? 'text-cyan-300' : 'text-slate-400'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
