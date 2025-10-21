'use client';
import React from 'react';
import { DiceFace } from './DiceFace';

export function Dice({ dice }: { dice: number[] }) {
  return (
    <div className="flex gap-2">
      {dice.map((d, i) => (
        <DiceFace
          key={i}
          value={d as 1 | 2 | 3 | 4 | 5 | 6}
          size={32}
          className="drop-shadow-sm"
        />
      ))}
    </div>
  );
}
