import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HorizontalCarouselProps {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
  ariaLabel?: string;
}

export const HorizontalCarousel: React.FC<HorizontalCarouselProps> = ({
  children,
  className = '',
  dark = false,
  ariaLabel,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const dragState = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
  });

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScrollButtons);
    ro.observe(el);
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [updateScrollButtons, children]);

  const scrollByAmount = (direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const step = Math.max(260, Math.round(el.clientWidth * 0.72));
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || e.button !== 0) return;
    dragState.current = {
      active: true,
      startX: e.pageX - el.offsetLeft,
      scrollLeft: el.scrollLeft,
      moved: false,
    };
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!dragState.current.active || !el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = x - dragState.current.startX;
    if (Math.abs(walk) > 6) {
      dragState.current.moved = true;
    }
    if (dragState.current.moved) {
      e.preventDefault();
      el.scrollLeft = dragState.current.scrollLeft - walk;
    }
  };

  const endDrag = () => {
    if (!dragState.current.active) return;
    dragState.current.active = false;
    setIsDragging(false);
    // Reset moved flag after click phase so genuine clicks still work
    window.setTimeout(() => {
      dragState.current.moved = false;
    }, 0);
  };

  const handleClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragState.current.moved) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const btnBase = dark
    ? 'border-white/15 bg-[#141414]/90 text-white hover:bg-black'
    : 'border-[#E5E5E5] bg-white/95 text-[#1A1A1A] hover:bg-white shadow-md dark:border-[#2E322E] dark:bg-[#161816]/95 dark:text-white dark:hover:bg-[#1E211E]';

  return (
    <div className="group/carousel relative">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByAmount(-1)}
          aria-label={ariaLabel ? `Scroll ${ariaLabel} left` : 'Scroll left'}
          className={`absolute top-1/2 left-2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur-xs transition-all md:flex ${btnBase}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={updateScrollButtons}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onClickCapture={handleClickCapture}
        className={`no-scrollbar flex overflow-x-auto select-none ${
          isDragging ? 'cursor-grabbing' : 'md:cursor-grab snap-x'
        } ${className}`}
      >
        {children}
      </div>

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByAmount(1)}
          aria-label={ariaLabel ? `Scroll ${ariaLabel} right` : 'Scroll right'}
          className={`absolute top-1/2 right-2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur-xs transition-all md:flex ${btnBase}`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};
