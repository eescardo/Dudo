'use client';
import { useEffect, useRef, useState, forwardRef, useCallback } from 'react';

interface ScrollableDialProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label: string;
  className?: string;
  renderValue?: (value: number) => React.ReactNode;
}

export const ScrollableDial = forwardRef<HTMLDivElement, ScrollableDialProps>(
  (
    {
      value,
      min,
      max,
      onChange,
      disabled = false,
      label,
      className = '',
      renderValue,
    },
    ref
  ) => {
    const dialRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [pendingValue, setPendingValue] = useState<number | null>(null);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const scrollAccumulatorRef = useRef(0);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{ y: number; value: number } | null>(null);

    const commitPendingValue = useCallback(() => {
      if (pendingValue !== null) {
        onChange(pendingValue);
        setPendingValue(null);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    }, [pendingValue, onChange]);

    // Touch/drag handlers
    const handleTouchStart = (e: React.TouchEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();

      const touch = e.touches[0];
      setIsDragging(true);
      dragStartRef.current = {
        y: touch.clientY,
        value: pendingValue ?? value,
      };

      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (disabled || !isDragging || !dragStartRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      const touch = e.touches[0];
      const deltaY = dragStartRef.current.y - touch.clientY; // Inverted: drag up = increase value
      const dragSensitivity = 30; // Higher = less sensitive
      const steps = Math.floor(Math.abs(deltaY) / dragSensitivity);

      if (steps > 0) {
        const direction = deltaY > 0 ? 1 : -1;
        const newPendingValue = Math.max(
          min,
          Math.min(max, dragStartRef.current.value + steps * direction)
        );

        setPendingValue(newPendingValue);
        dragStartRef.current = {
          y: touch.clientY,
          value: newPendingValue,
        };
      }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setIsDragging(false);
      dragStartRef.current = null;

      // Commit immediately upon touch release
      commitPendingValue();
    };

    // Mouse drag handlers (for desktop touch screens)
    const handleMouseDown = (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();

      setIsDragging(true);
      dragStartRef.current = {
        y: e.clientY,
        value: pendingValue ?? value,
      };

      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (disabled || !isDragging || !dragStartRef.current) return;
      e.preventDefault();

      const deltaY = dragStartRef.current.y - e.clientY; // Inverted: drag up = increase value
      const dragSensitivity = 30; // Higher = less sensitive
      const steps = Math.floor(Math.abs(deltaY) / dragSensitivity);

      if (steps > 0) {
        const direction = deltaY > 0 ? 1 : -1;
        const newPendingValue = Math.max(
          min,
          Math.min(max, dragStartRef.current.value + steps * direction)
        );

        setPendingValue(newPendingValue);
        dragStartRef.current = {
          y: e.clientY,
          value: newPendingValue,
        };
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;

      // Commit immediately upon mouse release
      commitPendingValue();
    };

    const handleWheel = (e: WheelEvent) => {
      if (disabled) return;
      e.preventDefault();

      // Focus the dial when scrolling over it
      if (dialRef.current && document.activeElement !== dialRef.current) {
        dialRef.current.focus();
      }

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Accumulate scroll delta
      scrollAccumulatorRef.current += e.deltaY;

      // Threshold for changing values (higher = slower scrolling)
      const scrollThreshold = 50;

      // Only change value when threshold is crossed
      if (Math.abs(scrollAccumulatorRef.current) >= scrollThreshold) {
        const delta = scrollAccumulatorRef.current > 0 ? 1 : -1;
        const newPendingValue = Math.max(
          min,
          Math.min(max, (pendingValue ?? value) + delta)
        );

        // Set pending value for smooth visual feedback
        setPendingValue(newPendingValue);

        // Reset accumulator
        scrollAccumulatorRef.current = 0;
      }

      // Set timeout to commit after 1 second of inactivity
      scrollTimeoutRef.current = setTimeout(() => {
        commitPendingValue();
      }, 1000);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;

      // Clear any pending scroll values when using keyboard
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
      setPendingValue(null);
      scrollAccumulatorRef.current = 0; // Reset scroll accumulator

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const newValue = Math.max(min, Math.min(max, value - 1));
        if (newValue !== value) {
          onChange(newValue);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const newValue = Math.max(min, Math.min(max, value + 1));
        if (newValue !== value) {
          onChange(newValue);
        }
      }
    };

    useEffect(() => {
      const dial = dialRef.current;
      if (!dial) return;

      dial.addEventListener('wheel', handleWheel, { passive: false });

      // Add global mouse event listeners for dragging
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (isDragging) {
          handleMouseMove(e as any);
        }
      };

      const handleGlobalMouseUp = () => {
        if (isDragging) {
          handleMouseUp();
        }
      };

      // Add global touch event listeners to prevent page scrolling
      const handleGlobalTouchMove = (e: TouchEvent) => {
        if (isDragging) {
          e.preventDefault();
          e.stopPropagation();
          handleTouchMove(e as any);
        }
      };

      const handleGlobalTouchEnd = (e: TouchEvent) => {
        if (isDragging) {
          e.preventDefault();
          e.stopPropagation();
          handleTouchEnd(e as any);
        }
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchmove', handleGlobalTouchMove, {
        passive: false,
      });
      document.addEventListener('touchend', handleGlobalTouchEnd, {
        passive: false,
      });

      return () => {
        dial.removeEventListener('wheel', handleWheel);
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('touchmove', handleGlobalTouchMove);
        document.removeEventListener('touchend', handleGlobalTouchEnd);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }, [handleWheel, disabled, isDragging]);

    return (
      <div className={`flex flex-col ${className}`}>
        <label className="text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <div
          ref={(node) => {
            dialRef.current = node;
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          tabIndex={disabled ? -1 : 0}
          className={`
            relative w-16 h-20 border-2 rounded-lg
            flex items-center justify-center
            bg-white cursor-pointer
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            select-none
            touch-none
            ${
              disabled
                ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60'
                : 'border-gray-400 hover:border-gray-500 hover:shadow-sm'
            }
            ${isFocused ? 'ring-2 ring-blue-500 border-blue-500' : ''}
            ${isDragging ? 'ring-2 ring-blue-400 border-blue-400 bg-blue-50' : ''}
          `}
          style={{ touchAction: 'none' }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            // Auto-commit pending value when focus is lost
            commitPendingValue();
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          role="spinbutton"
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-label={`${label}: ${value}`}
        >
          <div className="flex flex-col items-center justify-center h-full">
            {/* Previous number (above) */}
            <div className="select-none h-1/3 flex items-end justify-center opacity-40 scale-75">
              {(() => {
                const displayValue = pendingValue ?? value;
                const prevValue = displayValue > min ? displayValue - 1 : null;
                return prevValue ? (
                  renderValue ? (
                    renderValue(prevValue)
                  ) : (
                    <span className="text-sm text-gray-400">{prevValue}</span>
                  )
                ) : (
                  ''
                );
              })()}
            </div>

            {/* Current number (center) */}
            <div
              className={`select-none h-1/3 flex items-center justify-center transition-all duration-150 ${
                pendingValue !== null
                  ? 'ring-2 ring-blue-300 rounded-md px-1 bg-blue-50'
                  : ''
              }`}
            >
              {renderValue ? (
                renderValue(pendingValue ?? value)
              ) : (
                <span
                  className={`text-lg font-bold ${
                    pendingValue !== null ? 'text-blue-600' : 'text-gray-800'
                  }`}
                >
                  {pendingValue ?? value}
                </span>
              )}
            </div>

            {/* Next number (below) */}
            <div className="select-none h-1/3 flex items-start justify-center opacity-40 scale-75">
              {(() => {
                const displayValue = pendingValue ?? value;
                const nextValue = displayValue < max ? displayValue + 1 : null;
                return nextValue ? (
                  renderValue ? (
                    renderValue(nextValue)
                  ) : (
                    <span className="text-sm text-gray-400">{nextValue}</span>
                  )
                ) : (
                  ''
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  }
);
