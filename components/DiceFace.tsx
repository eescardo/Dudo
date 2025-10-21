'use client';

interface DiceFaceProps {
  value: 1 | 2 | 3 | 4 | 5 | 6;
  size?: number;
  className?: string;
}

export function DiceFace({ value, size = 24, className = '' }: DiceFaceProps) {
  const pipSize = size / 8;
  const center = size / 2;
  const offset = size / 4;

  const getPips = () => {
    switch (value) {
      case 1:
        return [{ x: center, y: center }];

      case 2:
        return [
          { x: center - offset, y: center - offset },
          { x: center + offset, y: center + offset },
        ];

      case 3:
        return [
          { x: center - offset, y: center - offset },
          { x: center, y: center },
          { x: center + offset, y: center + offset },
        ];

      case 4:
        return [
          { x: center - offset, y: center - offset },
          { x: center + offset, y: center - offset },
          { x: center - offset, y: center + offset },
          { x: center + offset, y: center + offset },
        ];

      case 5:
        return [
          { x: center - offset, y: center - offset },
          { x: center + offset, y: center - offset },
          { x: center, y: center },
          { x: center - offset, y: center + offset },
          { x: center + offset, y: center + offset },
        ];

      case 6:
        return [
          { x: center - offset, y: center - offset },
          { x: center + offset, y: center - offset },
          { x: center - offset, y: center },
          { x: center + offset, y: center },
          { x: center - offset, y: center + offset },
          { x: center + offset, y: center + offset },
        ];

      default:
        return [];
    }
  };

  const pips = getPips();

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-label={`Dice face showing ${value} pips`}
    >
      {/* Dice face background */}
      <rect
        x="1"
        y="1"
        width={size - 2}
        height={size - 2}
        rx="3"
        ry="3"
        fill="white"
        stroke="#374151"
        strokeWidth="1"
      />

      {/* Pips */}
      {pips.map((pip, index) => (
        <circle key={index} cx={pip.x} cy={pip.y} r={pipSize} fill="#1f2937" />
      ))}
    </svg>
  );
}
