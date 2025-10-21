'use client';
import { useState, useEffect, useRef } from 'react';
import { ScrollableDial } from './ScrollableDial';
import { DiceFace } from './DiceFace';

export function BidForm({
  onSubmit,
  minQty = 1,
  maxQty = 5,
  activePlayer = false,
}: {
  onSubmit: (qty: number, face: number) => void;
  minQty?: number;
  maxQty?: number;
  activePlayer?: boolean;
}) {
  const [qty, setQty] = useState(minQty);
  const [face, setFace] = useState(2);
  const qtyDialRef = useRef<HTMLDivElement>(null);
  const faceDialRef = useRef<HTMLDivElement>(null);
  const bidButtonRef = useRef<HTMLButtonElement>(null);

  // Reset qty when minQty changes
  useEffect(() => {
    if (qty < minQty) {
      setQty(minQty);
    }
  }, [minQty, qty]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activePlayer) {
      onSubmit(qty, face);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      // Allow normal tab behavior
      return;
    }

    if (e.key === 'Enter' && activePlayer) {
      e.preventDefault();
      onSubmit(qty, face);
      return;
    }

    // Handle arrow keys for navigation between dials
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      if (document.activeElement === qtyDialRef.current) {
        faceDialRef.current?.focus();
      } else if (document.activeElement === faceDialRef.current) {
        bidButtonRef.current?.focus();
      }
    }
  };

  return (
    <div className="flex items-end gap-3">
      <ScrollableDial
        ref={qtyDialRef}
        value={qty}
        min={minQty}
        max={maxQty}
        onChange={setQty}
        disabled={!activePlayer}
        label="Qty"
        className="flex-shrink-0"
      />

      <ScrollableDial
        ref={faceDialRef}
        value={face}
        min={1}
        max={6}
        onChange={setFace}
        disabled={!activePlayer}
        label="Face"
        className="flex-shrink-0"
        renderValue={(value) => (
          <DiceFace
            value={value as 1 | 2 | 3 | 4 | 5 | 6}
            size={20}
            className="drop-shadow-sm"
          />
        )}
      />

      <button
        ref={bidButtonRef}
        onClick={handleSubmit}
        onKeyDown={handleKeyDown}
        className={`
          px-4 py-2 border-2 rounded-lg font-medium
          transition-all duration-150
          focus:outline-none focus:ring-2 focus:ring-blue-500
          ${
            activePlayer
              ? 'border-gray-400 hover:border-gray-500 hover:shadow-sm bg-white text-gray-800'
              : 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed'
          }
        `}
        disabled={!activePlayer}
        type="button"
      >
        Bid
      </button>
    </div>
  );
}
