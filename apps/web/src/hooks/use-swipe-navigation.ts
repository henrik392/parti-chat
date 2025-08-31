import type { PanInfo } from 'motion/react';
import { useCallback, useState } from 'react';

type UseSwipeNavigationProps = {
  activeIndex: number;
  totalItems: number;
  onIndexChange: (newIndex: number) => void;
  swipeThreshold?: number;
  velocityThreshold?: number;
};

type SwipeState = {
  offset: number;
  isDragging: boolean;
  isSwipeActive: boolean;
};

export function useSwipeNavigation({
  activeIndex,
  totalItems,
  onIndexChange,
  swipeThreshold = 50,
  velocityThreshold = 500,
}: UseSwipeNavigationProps) {
  const [swipeState, setSwipeState] = useState<SwipeState>({
    offset: 0,
    isDragging: false,
    isSwipeActive: false,
  });

  const handlePanStart = useCallback(() => {
    setSwipeState((prev) => ({
      ...prev,
      isDragging: true,
      isSwipeActive: false,
    }));
  }, []);

  const handlePan = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      // Check if this is more horizontal than vertical movement
      const horizontalMovement = Math.abs(info.offset.x);
      const verticalMovement = Math.abs(info.offset.y);
      const isHorizontalSwipe =
        horizontalMovement > verticalMovement && horizontalMovement > 10;

      // Only activate swipe if it's clearly horizontal movement
      if (!isHorizontalSwipe) {
        return;
      }

      // Limit the offset to provide resistance at boundaries
      const maxOffset = 100; // Maximum offset before resistance kicks in
      let constrainedOffset = info.offset.x;

      // Add resistance at boundaries
      const BOUNDARY_RESISTANCE = 0.3;
      if (
        (activeIndex === 0 && info.offset.x > 0) ||
        (activeIndex === totalItems - 1 && info.offset.x < 0)
      ) {
        constrainedOffset = info.offset.x * BOUNDARY_RESISTANCE; // Reduced movement at boundaries
      }

      setSwipeState({
        offset: Math.max(-maxOffset, Math.min(maxOffset, constrainedOffset)),
        isDragging: true,
        isSwipeActive: true,
      });
    },
    [activeIndex, totalItems]
  );

  const handlePanEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset, velocity } = info;
      const swipeDistance = Math.abs(offset.x);
      const swipeVelocity = Math.abs(velocity.x);

      // Determine if swipe is significant enough to trigger navigation
      const shouldNavigate =
        swipeDistance > swipeThreshold || swipeVelocity > velocityThreshold;

      if (!shouldNavigate) {
        // Reset swipe state if swipe doesn't meet threshold
        setSwipeState({ offset: 0, isDragging: false, isSwipeActive: false });
        return;
      }

      let newIndex = activeIndex;

      // Swipe right (positive offset) - go to previous tab
      if (offset.x > 0 && activeIndex > 0) {
        newIndex = activeIndex - 1;
      }
      // Swipe left (negative offset) - go to next tab
      else if (offset.x < 0 && activeIndex < totalItems - 1) {
        newIndex = activeIndex + 1;
      }

      if (newIndex !== activeIndex) {
        onIndexChange(newIndex);
      }

      // Reset swipe state
      setSwipeState({ offset: 0, isDragging: false, isSwipeActive: false });
    },
    [activeIndex, totalItems, onIndexChange, swipeThreshold, velocityThreshold]
  );

  return {
    handlePanStart,
    handlePan,
    handlePanEnd,
    swipeState,
  };
}
