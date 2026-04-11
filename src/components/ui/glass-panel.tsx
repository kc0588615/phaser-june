import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Use pill shape (border-radius: 9999px) */
  pill?: boolean;
  /** Border color override (CSS value) */
  borderColor?: string;
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, pill, borderColor, style, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'glass-bg shadow-card border border-ds-subtle',
          pill ? 'rounded-full' : 'rounded-lg',
          className,
        )}
        style={borderColor ? { borderColor, ...style } : style}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassPanel.displayName = 'GlassPanel';
