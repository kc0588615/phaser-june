import React, { useRef, useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, A11y, Keyboard } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import 'swiper/css';
import 'swiper/css/navigation';

import SpeciesCard from '@/components/SpeciesCard';
import { getFamilyDisplayNameFromSpecies } from '@/utils/ecoregion';
import type { Species } from '@/types/database';

interface SpeciesCarouselProps {
  family: string;
  speciesList: Species[];
  discoveredSpecies: Record<number, { name: string; discoveredAt: string }>;
  category: string;
  onNavigateToTop: () => void;
}

export default function SpeciesCarousel({
  family,
  speciesList,
  discoveredSpecies,
  category,
  onNavigateToTop,
}: SpeciesCarouselProps) {
  const prevRef = useRef<HTMLButtonElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const swiperRef = useRef<SwiperType>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);

  // Enable loop only when there are enough slides to support it reliably.
  // Using >= 3 avoids Swiper's "not enough for loop" warning across edge cases.
  const enableLoop = speciesList.length >= 3;

  // Cleanup effect to prevent crashes on unmount
  useEffect(() => {
    return () => {
      // Clean up any pending operations
      if (swiperRef.current && !swiperRef.current.destroyed) {
        swiperRef.current.destroy(true, true);
      }
    };
  }, []);

  const handleSlideChange = (swiper: SwiperType) => {
    setCurrentSlide(swiper.realIndex);
    // With loop enabled, beginning/end states are handled differently
    if (enableLoop) {
      setIsBeginning(false);
      setIsEnd(false);
    } else {
      setIsBeginning(swiper.isBeginning);
      setIsEnd(swiper.isEnd);
    }
  };

  return (
    <div className="relative bg-slate-700/50 border border-slate-600 rounded-lg overflow-visible w-full max-w-full">
      {/* Family Header */}
      <div className="px-2 sm:px-3 py-3 bg-slate-800/70 border-b border-slate-600">
        <div className="w-full">
          {/* Family name - FORCED to wrap */}
          <div className="w-full mb-2">
            <h3 
              className="leading-tight font-medium text-foreground"
              style={{ 
                fontSize: 'clamp(11px, 2.5vw, 16px)',
                lineHeight: '1.2',
                wordBreak: 'break-all',
                overflowWrap: 'break-word',
                hyphens: 'auto',
                whiteSpace: 'normal',
                width: '100%',
                maxWidth: '100%'
              }}
            >
              {getFamilyDisplayNameFromSpecies(family)}
            </h3>
          </div>
          
          {/* Counters - FORCED to wrap at narrow width */}
          <div className="flex flex-wrap items-center justify-between gap-1" style={{ width: '100%' }}>
            <span 
              className="text-muted-foreground"
              style={{ 
                fontSize: 'clamp(9px, 2vw, 12px)',
                whiteSpace: 'nowrap',
                minWidth: 'max-content'
              }}
            >
              {speciesList.length} species
            </span>
            {speciesList.length > 1 && (
              <span 
                className="text-slate-300 font-mono"
                style={{ 
                  fontSize: 'clamp(10px, 2vw, 12px)',
                  whiteSpace: 'nowrap',
                  minWidth: 'max-content'
                }}
              >
                {currentSlide + 1}/{speciesList.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Swiper Container - Mobile-first with proper padding to prevent clipping */}
      <div className="relative w-full overflow-visible px-4 sm:px-6">
        <Swiper
          key={`species-carousel-${enableLoop ? 'loop' : 'no-loop'}`} // force re-init if loop setting changes
          modules={[Navigation, A11y, Keyboard]}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
            const timer = setTimeout(() => {
              if (swiper.activeIndex !== 0) {
                swiper.slideTo(0, 0);
              }
              handleSlideChange(swiper);
              // Force recalculate after layout settles
              if (!swiper.destroyed) {
                swiper.update();
                if (typeof swiper.updateAutoHeight === 'function') {
                  swiper.updateAutoHeight.call(swiper, 0);
                }
              }
            }, 100);
          }}
          onSlideChange={(swiper) => {
            handleSlideChange(swiper);
            // Force height recalculation on each slide change
            const timer = setTimeout(() => {
              // Avoid re-entrant slideChange loops; only adjust height
              if (!swiper.destroyed && typeof swiper.updateAutoHeight === 'function') {
                swiper.updateAutoHeight.call(swiper, 0);
              }
            }, 50);
          }}
          onSlideChangeTransitionEnd={(swiper) => {
            // Ensure proper height after transition completes
            if (!swiper.destroyed && typeof swiper.updateAutoHeight === 'function') {
              swiper.updateAutoHeight.call(swiper, 0);
            }
          }}
          spaceBetween={8}
          slidesPerView={1}
          initialSlide={0}
          loop={enableLoop}
          autoHeight
          // Only watchOverflow when loop is disabled
          watchOverflow={!enableLoop}
          observer
          observeParents
          observeSlideChildren
          updateOnWindowResize
          roundLengths
          keyboard={{ enabled: true, onlyInViewport: true }}
          navigation={{
            prevEl: prevRef.current,
            nextEl: nextRef.current,
          }}
          onBeforeInit={(swiper) => {
            // @ts-expect-error - Swiper types don't include this pattern
            swiper.params.navigation.prevEl = prevRef.current;
            // @ts-expect-error - Swiper types don't include this pattern
            swiper.params.navigation.nextEl = nextRef.current;
          }}
          breakpoints={{
            480: {
              slidesPerView: 1,
              spaceBetween: 12,
            },
          }}
          className="mobile-species-swiper !overflow-visible w-full"
        >
          {speciesList.map((species) => {
            const isDiscovered = !!discoveredSpecies[species.ogc_fid];
            return (
              <SwiperSlide key={species.ogc_fid} className="!h-auto w-full flex-shrink-0">
                {/* Constrain card for mobile screens */}
                <div className="p-2 sm:p-3 w-full" style={{ maxWidth: '100%' }}>
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

        {/* Mobile-optimized navigation arrows - positioned inside viewport with padding buffer */}
        {speciesList.length > 1 && (
          <>
            <button
              ref={prevRef}
              className={`absolute left-1 top-1/2 -translate-y-1/2 z-[80] p-2 rounded-full transition-all min-w-[40px] min-h-[40px] items-center justify-center flex bg-slate-900/90 border border-slate-700 backdrop-blur shadow-lg ${
                isBeginning ? 'text-slate-500 cursor-not-allowed' : 'text-white hover:bg-slate-800/95'
              }`}
              disabled={isBeginning}
              aria-label="Previous species"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              ref={nextRef}
              className={`absolute right-1 top-1/2 -translate-y-1/2 z-[80] p-2 rounded-full transition-all min-w-[40px] min-h-[40px] items-center justify-center flex bg-slate-900/90 border border-slate-700 backdrop-blur shadow-lg ${
                isEnd ? 'text-slate-500 cursor-not-allowed' : 'text-white hover:bg-slate-800/95'
              }`}
              disabled={isEnd}
              aria-label="Next species"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Bottom control bar for very narrow screens (360-414px focus) */}
        {speciesList.length > 1 && (
          <div className="flex justify-center pt-2 pb-3 px-2 sm:hidden">
            <div className="bg-slate-900/80 border border-slate-700 rounded-full shadow-md backdrop-blur px-3 py-1.5 flex items-center gap-2 w-full">
              <button
                className={`px-2 py-1 rounded-full min-w-[50px] ${
                  isBeginning ? 'bg-slate-800/60 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500'
                }`}
                style={{ fontSize: 'clamp(9px, 2vw, 12px)' }}
                disabled={isBeginning}
                aria-label="Previous species"
                onClick={() => swiperRef.current?.slidePrev()}
              >
                Prev
              </button>
              <span 
                className="text-slate-300 font-mono px-1"
                style={{ fontSize: 'clamp(9px, 2vw, 11px)' }}
              >
                {currentSlide + 1}/{speciesList.length}
              </span>
              <button
                className={`px-2 py-1 rounded-full min-w-[50px] ${
                  isEnd ? 'bg-slate-800/60 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500'
                }`}
                style={{ fontSize: 'clamp(9px, 2vw, 12px)' }}
                disabled={isEnd}
                aria-label="Next species"
                onClick={() => swiperRef.current?.slideNext()}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}