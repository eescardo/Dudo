'use client';
import { useState } from 'react';

export function BidForm({
  onSubmit,
  minQty = 1,
}: {
  onSubmit: (qty: number, face: number) => void;
  minQty?: number;
}) {
  const [qty, setQty] = useState(minQty);
  const [face, setFace] = useState(2);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(qty, face);
      }}
      className="flex items-end gap-2"
    >
      <label className="flex flex-col text-sm">
        Qty
        <input
          className="border p-1 w-16"
          type="number"
          min={minQty}
          value={qty}
          onChange={(e) => setQty(parseInt(e.target.value || '1'))}
        />
      </label>
      <label className="flex flex-col text-sm">
        Face
        <select
          className="border p-1"
          value={face}
          onChange={(e) => setFace(parseInt(e.target.value))}
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <button className="border px-3 py-1">Bid</button>
    </form>
  );
}
