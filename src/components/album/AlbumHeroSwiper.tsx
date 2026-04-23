import { useRef, useCallback, useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCards, Keyboard, A11y } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { X } from 'lucide-react';
import SpeciesTCGCard from '@/components/album/SpeciesTCGCard';
import type { Species } from '@/types/database';
import type { FeatureClass } from '@/types/gis';
import 'swiper/css';
import 'swiper/css/effect-cards';

type RunMemoryData = {
  nodes?: Array<{ nodeType: string; counterGem: string | null; obstacleFamily: string | null; scoreEarned: number }>;
  realm?: string;
  biome?: string;
  bioregion?: string;
  finalScore?: number | null;
  startedAt?: string;
  gisFeaturesNearby?: Array<{ featureClass: string }>;
};

interface AlbumHeroSwiperProps {
  speciesList: Species[];
  discoveredSpecies: Record<number, { name: string; discoveredAt: string }>;
  initialIndex?: number;
  onClose: () => void;
  onSlideChange?: (index: number) => void;
}

export default function AlbumHeroSwiper({
  speciesList,
  discoveredSpecies,
  initialIndex = 0,
  onClose,
  onSlideChange,
}: AlbumHeroSwiperProps) {
  const swiperRef = useRef<SwiperType>();
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [runMemoryCache, setRunMemoryCache] = useState<Record<number, RunMemoryData | null>>({});
  const [cardStampsCache, setCardStampsCache] = useState<Record<number, FeatureClass[]>>({});

  // Fetch run memory + card data for the currently focused species
  const inFlightRef = useRef(new Set<number>());
  useEffect(() => {
    const species = speciesList[activeIndex];
    if (!species) return;
    const sid = species.id;
    if (sid in runMemoryCache || inFlightRef.current.has(sid)) return;

    inFlightRef.current.add(sid);

    fetch(`/api/species/cards/${sid}`)
      .then(r => {
        if (!r.ok) { inFlightRef.current.delete(sid); return null; }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        // Cache card-level GIS stamps (authoritative)
        if (data.card?.gisStamps && Array.isArray(data.card.gisStamps) && data.card.gisStamps.length > 0) {
          setCardStampsCache(prev => ({ ...prev, [sid]: data.card.gisStamps as FeatureClass[] }));
        }
        if (data.memories?.length > 0) {
          const mem = data.memories[data.memories.length - 1];
          setRunMemoryCache(prev => ({ ...prev, [sid]: mem }));
        } else {
          setRunMemoryCache(prev => ({ ...prev, [sid]: null }));
        }
      })
      .catch(() => { inFlightRef.current.delete(sid); });
  }, [activeIndex, speciesList, runMemoryCache]);

  const handleSlideChange = useCallback((swiper: SwiperType) => {
    setActiveIndex(swiper.realIndex);
    onSlideChange?.(swiper.realIndex);
  }, [onSlideChange]);

  if (speciesList.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[110] p-2 rounded-full bg-slate-800/80 border border-slate-700 text-white hover:bg-slate-700 transition-colors"
        aria-label="Close focused view"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 z-[110] text-sm text-slate-400 font-mono">
        {activeIndex + 1} / {speciesList.length}
      </div>

      {/* Card swiper */}
      <div className="w-full max-w-[360px] px-4">
        <Swiper
          modules={[EffectCards, Keyboard, A11y]}
          effect="cards"
          grabCursor
          initialSlide={initialIndex}
          keyboard={{ enabled: true }}
          onSwiper={(swiper) => { swiperRef.current = swiper; }}
          onSlideChange={handleSlideChange}
          cardsEffect={{
            slideShadows: false,
            perSlideOffset: 8,
            perSlideRotate: 2,
          }}
          a11y={{
            prevSlideMessage: 'Previous card',
            nextSlideMessage: 'Next card',
          }}
          className="!overflow-visible"
        >
          {speciesList.map((species) => {
            const isDiscovered = !!discoveredSpecies[species.id];
            const memory = runMemoryCache[species.id] ?? undefined;
            const gisStamps = cardStampsCache[species.id]
              ?? memory?.gisFeaturesNearby?.map(f => f.featureClass as FeatureClass).filter(Boolean)
              ?? undefined;
            return (
              <SwiperSlide key={species.id} className="!overflow-visible">
                <SpeciesTCGCard
                  species={species}
                  isDiscovered={isDiscovered}
                  discoveredAt={discoveredSpecies[species.id]?.discoveredAt}
                  runMemory={memory}
                  gisStamps={gisStamps}
                />
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>

      {/* Hint */}
      <p className="text-[10px] text-slate-600 mt-6">Swipe or arrow keys to browse &middot; Tap card to flip</p>
    </div>
  );
}
