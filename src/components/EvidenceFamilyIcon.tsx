import { Dna, Eye, Leaf, MapPin, PawPrint, type LucideProps } from 'lucide-react';
import type { EvidenceFamily } from '@/expedition/evidenceFamilies';

export function EvidenceFamilyIcon({ family, ...props }: LucideProps & { family: EvidenceFamily }) {
  if (family === 'relatives') return <Dna {...props} />;
  if (family === 'body') return <PawPrint {...props} />;
  if (family === 'behavior') return <Eye {...props} />;
  if (family === 'habits') return <Leaf {...props} />;
  return <MapPin {...props} />;
}
