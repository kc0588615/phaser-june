import { useRef, useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Keyboard, A11y } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Species } from '@/types/database';
import SpeciesCard from '@/components/SpeciesCard';
import { getFamilyDisplayNameFromSpecies } from '@/utils/ecoregion';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface FamilyCardStackProps {
  family: string;
  speciesList: Species[];
  discoveredSpecies: Record<number, { name: string; discoveredAt: string }>;
  category: string;
  onNavigateToTop: () => void;
}

export default function FamilyCardStack({
  family,
  speciesList,
  discoveredSpecies,
  category,
  onNavigateToTop
}: FamilyCardStackProps) {
  const swiperRef = useRef<SwiperType>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);

  // Generate unique IDs for navigation buttons
  const prevButtonId = `swiper-prev-${family}`;
  const nextButtonId = `swiper-next-${family}`;
  const paginationId = `swiper-pagination-${family}`;

  const handleSlideChange = (swiper: SwiperType) => {
    setCurrentSlide(swiper.realIndex);
    setIsBeginning(swiper.isBeginning);
    setIsEnd(swiper.isEnd);
  };

  const goToSlide = (index: number) => {
    if (swiperRef.current) {
      swiperRef.current.slideTo(index);
    }
  };

  return (
    <div className="relative bg-slate-700/50 border border-slate-600 rounded-lg overflow-hidden">
      {/* Family Header */}
      <div className="px-3 sm:px-4 py-3 bg-slate-800/70 border-b border-slate-600">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-medium text-foreground truncate">
              {getFamilyDisplayNameFromSpecies(family)}
            </h3>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {speciesList.length} species {speciesList.length > 1 ? '• Swipe to browse →' : ''}
            </span>
          </div>
          {speciesList.length > 1 && (
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <button
                id={prevButtonId}
                className={`p-2 rounded-full transition-all touch-manipulation ${
                  isBeginning 
                    ? 'text-slate-500 cursor-not-allowed bg-slate-800/30' 
                    : 'text-white bg-blue-600 hover:bg-blue-500 shadow-md hover:shadow-lg'
                }`}
                disabled={isBeginning}
                aria-label="Previous species"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <span className="text-xs text-slate-300 font-mono min-w-[2.5rem] text-center px-2">
                {currentSlide + 1}/{speciesList.length}
              </span>
              <button
                id={nextButtonId}
                className={`p-2 rounded-full transition-all touch-manipulation ${
                  isEnd 
                    ? 'text-slate-500 cursor-not-allowed bg-slate-800/30' 
                    : 'text-white bg-blue-600 hover:bg-blue-500 shadow-md hover:shadow-lg'
                }`}
                disabled={isEnd}
                aria-label="Next species"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Swiper Container */}
      <div className="relative">
        <Swiper
          modules={[Navigation, Pagination, Keyboard, A11y]}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
            // Ensure we start at slide 0 and update React state
            setTimeout(() => {
              if (swiper.activeIndex !== 0) {
                swiper.slideTo(0, 0); // Go to slide 0 with no transition
              }
              handleSlideChange(swiper);
            }, 0);
          }}
          onSlideChange={handleSlideChange}
          spaceBetween={0}
          slidesPerView={1}
          initialSlide={0}
          navigation={{
            prevEl: `#${prevButtonId}`,
            nextEl: `#${nextButtonId}`,
          }}
          pagination={speciesList.length > 1 ? {
            el: `#${paginationId}`,
            clickable: true,
            bulletClass: 'swiper-pagination-bullet bg-slate-400 opacity-50',
            bulletActiveClass: 'swiper-pagination-bullet-active bg-blue-400 opacity-100',
          } : false}
          keyboard={{
            enabled: true,
            onlyInViewport: true,
          }}
          touchRatio={1}
          threshold={5}
          shortSwipes={true}
          longSwipes={true}
          allowTouchMove={true}
          simulateTouch={true}
          touchStartPreventDefault={false}
          a11y={{
            prevSlideMessage: 'Previous species',
            nextSlideMessage: 'Next species',
          }}
          className="family-card-swiper"
        >
          {speciesList.map((species, index) => {
            const isDiscovered = !!discoveredSpecies[species.ogc_fid];
            return (
              <SwiperSlide key={species.ogc_fid}>
                <div className="p-4">
                  <SpeciesCard
                    species={species}
                    category={category}
                    isDiscovered={isDiscovered}
                    discoveredAt={discoveredSpecies[species.ogc_fid]?.discoveredAt}
                    onNavigateToTop={onNavigateToTop}
                  />
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>

        {/* Pagination dots */}
        {speciesList.length > 1 && (
          <div 
            id={paginationId}
            className="flex justify-center py-3 bg-slate-800/30"
          />
        )}
      </div>
    </div>
  );
}