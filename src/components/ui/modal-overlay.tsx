import { cn } from '@/lib/utils';

interface ModalOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 'absolute' for in-container overlays, 'fixed' for full-screen */
  position?: 'absolute' | 'fixed';
  /** Background opacity, e.g. 'bg-black/60' */
  bgClass?: string;
  /** Enable backdrop blur */
  blur?: boolean;
}

export function ModalOverlay({
  position = 'absolute',
  bgClass = 'bg-[rgba(10,14,26,0.6)]',
  blur = true,
  className,
  children,
  ...props
}: ModalOverlayProps) {
  return (
    <div
      className={cn(
        'inset-0 flex items-center justify-center',
        position === 'fixed' ? 'fixed' : 'absolute',
        bgClass,
        blur && 'backdrop-blur-sm',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
