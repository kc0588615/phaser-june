import { Species } from '@/types/database';
import SpeciesCard from '@/components/SpeciesCard';

interface SpeciesCardSlideProps {
  species: Species;
  category: string;
  isDiscovered: boolean;
  discoveredAt?: string;
  onNavigateToTop: () => void;
  isActive?: boolean;
  cardIndex?: number;
  totalCards?: number;
}

export default function SpeciesCardSlide({ 
  species, 
  category,
  isDiscovered,
  discoveredAt,
  onNavigateToTop,
  isActive = false,
  cardIndex = 0,
  totalCards = 1
}: SpeciesCardSlideProps) {
  return (
    <div className="relative w-full h-full">
      {/* Card index indicator for active slide */}
      {isActive && totalCards > 1 && (
        <div className="absolute top-4 right-4 z-10 bg-slate-800/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-slate-300 border border-slate-600">
          {cardIndex + 1} of {totalCards}
        </div>
      )}

      {/* Species Card */}
      <div className={`
        transition-all duration-300 ease-out
        ${isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-80'}
      `}>
        <SpeciesCard 
          species={species}
          category={category}
          isDiscovered={isDiscovered}
          discoveredAt={discoveredAt}
          onNavigateToTop={onNavigateToTop}
        />
      </div>

      {/* Discovered indicator overlay */}
      {isDiscovered && (
        <div className="absolute top-4 left-4 z-10 bg-green-600/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-white font-semibold border border-green-500">
          ✅ Discovered
        </div>
      )}
    </div>
  );
}