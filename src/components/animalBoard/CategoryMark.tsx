// One mark per question category (plan 055): the same icon on the guide's headings, "Its answers" rows, the grid's
// question tiles and witness notes, so a player links a question to the signs and lines that bear on it. No new
// colour: the icon takes the text colour, and the word is always printed or read out.
import { Baby, Eye, MapPin, PawPrint, Trees, type LucideIcon } from 'lucide-react';
import { CATEGORY_LABELS, type ChargeCategory } from '@/clueGame/questionMatch';

export const CATEGORY_ICON: Record<ChargeCategory, LucideIcon> = { body: Eye, habits: PawPrint, habitat: Trees, range: MapPin, life: Baby };

export function CategoryMark({ category, word = true, small = false, className = '' }: {
  category: ChargeCategory;
  /** Print the category's word beside the icon; otherwise screen readers alone get it. */
  word?: boolean;
  small?: boolean;
  className?: string;
}) {
  const Icon = CATEGORY_ICON[category];
  return (
    <span data-category-mark={category} className={`inline-flex items-center gap-xxs ${className}`}>
      <Icon className={`${small ? 'h-3 w-3' : 'h-3.5 w-3.5'} shrink-0`} aria-hidden="true" />
      <span className={word ? undefined : 'sr-only'}>{CATEGORY_LABELS[category]}</span>
    </span>
  );
}
