import { useRef, useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Keyboard, A11y } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Species } from '@/types/database';
import SpeciesCard from '@/components/SpeciesCard';

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);
  const [containerReady, setContainerReady] = useState(false);

  // Generate unique IDs for navigation buttons (slug-safe)
  const slug = family.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  const prevButtonId = `swiper-prev-${slug}`;
  const nextButtonId = `swiper-next-${slug}`;
  const paginationId = `swiper-pagination-${slug}`;

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

  // Container readiness detection with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const checkReady = () => {
      // Mark ready only when element has layout
      setContainerReady(el.clientWidth > 0);
    };
    const ro = new ResizeObserver(() => {
      checkReady();
      const s = swiperRef.current;
      if (!s || s.destroyed) return;
      s.update();
      if (typeof s.updateAutoHeight === 'function') {
        s.updateAutoHeight.call(s, 0);
      }
    });
    checkReady();
    ro.observe(el);
    return () => ro.disconnect();
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

  // Force Swiper to recalculate on resize
  useEffect(() => {
    const handleResize = () => {
      if (swiperRef.current) {
        setTimeout(() => {
          const s = swiperRef.current;
          if (!s || s.destroyed) return;
          s.update();
          if (typeof s.updateAutoHeight === 'function') {
            s.updateAutoHeight.call(s, 0);
          }
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Also recalc on container size changes (accordion open/close, padding changes, etc.)
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      const s = swiperRef.current;
      if (!s || s.destroyed) return;
      s.update();
      if (typeof s.updateAutoHeight === 'function') {
        s.updateAutoHeight.call(s, 0);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative bg-slate-700/50 border border-slate-600 rounded-lg overflow-visible w-full max-w-full"
    >
      {/* Family Header */}
      <div className="px-2 sm:px-3 md:px-4 py-2 bg-slate-800/70 border-b border-slate-600">
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

      {/* Swiper Container */}
      <div
        ref={containerRef}
        className="relative w-full overflow-visible px-2 sm:px-3"
        style={{
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 8px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 8px)',
        }}
      >
        <Swiper
          key={`${slug}-${enableLoop ? 'loop' : 'no-loop'}`} // force re-init if loop setting changes
          modules={[Navigation, Pagination, Keyboard, A11y]}
          onBeforeInit={(swiper) => {
            // Bind external navigation reliably
            if (swiper.params.navigation && typeof swiper.params.navigation === 'object') {
              swiper.params.navigation.prevEl = `#${prevButtonId}`;
              swiper.params.navigation.nextEl = `#${nextButtonId}`;
            }
          }}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
            // Ensure we start at slide 0 and update React state
            setTimeout(() => {
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
            setTimeout(() => {
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
          spaceBetween={0}
          slidesPerView={1}
          initialSlide={0}
          loop={enableLoop}
          navigation={{
            prevEl: `#${prevButtonId}`,
            nextEl: `#${nextButtonId}`,
          }}
          autoHeight
          // Only watchOverflow when loop is disabled to avoid loop warnings
          watchOverflow={!enableLoop}
          observer
          observeParents
          observeSlideChildren
          updateOnWindowResize
          roundLengths
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
          shortSwipes
          longSwipes
          allowTouchMove
          simulateTouch
          touchStartPreventDefault={false}
          a11y={{
            prevSlideMessage: 'Previous species',
            nextSlideMessage: 'Next species',
          }}
          className="family-card-swiper !overflow-visible w-full mx-auto"
        >
          {speciesList.map((species, index) => {
            const isDiscovered = !!discoveredSpecies[species.ogc_fid];
            return (
              <SwiperSlide key={species.ogc_fid} className="!h-auto w-full flex-shrink-0">
                {/* Responsive card wrapper - fluid width with minimal padding */}
                <div className="p-1 sm:p-2 w-full" style={{ maxWidth: '100%' }}>
                  <SpeciesCard
                    species={species}
                    category={category}
                    speciesPositionLabel={`Species ${index + 1} of ${speciesList.length}`}
                    isDiscovered={isDiscovered}
                    discoveredAt={discoveredSpecies[species.ogc_fid]?.discoveredAt}
                    onNavigateToTop={onNavigateToTop}
                  />
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>

        {/* Bottom control bar for mobile/tablet (always visible, no clipping) */}
        {speciesList.length > 1 && (
          <div
            className="lg:hidden flex justify-center pt-2 pb-3 px-2"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
          >
            <div className="bg-slate-900/85 border border-slate-700 rounded-full shadow-md backdrop-blur px-2 py-1.5 flex items-center gap-2 w-full">
              <button
                className={`px-2.5 py-1.5 rounded-full min-w-[56px] ${
                  isBeginning ? 'bg-slate-800/60 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500'
                }`}
                style={{ fontSize: 'clamp(9px, 2vw, 14px)' }}
                disabled={isBeginning}
                aria-label="Previous species"
                onClick={() => swiperRef.current?.slidePrev()}
              >
                Prev
              </button>
              <span 
                className="text-slate-300 font-mono px-2"
                style={{ fontSize: 'clamp(9px, 2vw, 12px)' }}
              >
                {currentSlide + 1}/{speciesList.length}
              </span>
              <button
                className={`px-2.5 py-1.5 rounded-full min-w-[56px] ${
                  isEnd ? 'bg-slate-800/60 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500'
                }`}
                style={{ fontSize: 'clamp(9px, 2vw, 14px)' }}
                disabled={isEnd}
                aria-label="Next species"
                onClick={() => swiperRef.current?.slideNext()}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Side overlay arrows (desktop only) */}
        {speciesList.length > 1 && (
          <>
            <button
              id={prevButtonId}
              className={`hidden lg:flex absolute left-2 top-1/2 -translate-y-1/2 z-[80] p-2 rounded-full transition-all touch-manipulation min-w-[44px] min-h-[44px] items-center justify-center bg-slate-900/80 border border-slate-700 backdrop-blur shadow-lg ${
                isBeginning ? 'text-slate-500 cursor-not-allowed' : 'text-white hover:bg-slate-800/90'
              }`}
              disabled={isBeginning}
              aria-label="Previous species"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              id={nextButtonId}
              className={`hidden lg:flex absolute right-2 top-1/2 -translate-y-1/2 z-[80] p-2 rounded-full transition-all touch-manipulation min-w-[44px] min-h-[44px] items-center justify-center bg-slate-900/80 border border-slate-700 backdrop-blur shadow-lg ${
                isEnd ? 'text-slate-500 cursor-not-allowed' : 'text-white hover:bg-slate-800/90'
              }`}
              disabled={isEnd}
              aria-label="Next species"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

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
