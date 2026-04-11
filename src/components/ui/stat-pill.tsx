import { cn } from '@/lib/utils';

interface StatPillProps {
  label: string;
  value: React.ReactNode;
  color?: string;
  className?: string;
}

export function StatPill({ label, value, color = 'var(--ds-accent-cyan)', className }: StatPillProps) {
  return (
    <div className={cn('flex items-center gap-ds-xs', className)}>
      <span className="text-ds-badge text-ds-text-muted font-medium">{label}</span>
      <span className="text-ds-heading-sm font-bold" style={{ color }}>{value}</span>
    </div>
  );
}
