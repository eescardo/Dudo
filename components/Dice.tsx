'use client';
import React from 'react';

export function Dice({ dice }: { dice: number[] }) {
  return (
    <div className="flex gap-2">
      {dice.map((d, i) => (
        <span
          key={i}
          className="inline-flex h-8 w-8 items-center justify-center rounded border text-lg"
        >
          {d}
        </span>
      ))}
    </div>
  );
}
