import React from 'react';

interface QrCodeSvgProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * Deterministic high-contrast QR-style verification matrix SVG
 * seeded from the unique Order/Claim ID.
 */
export const QrCodeSvg: React.FC<QrCodeSvgProps> = ({ value, size = 180, className = '' }) => {
  const gridSize = 21;

  // Simple deterministic hash PRNG from value string
  let seed = 2166136261;
  for (let i = 0; i < value.length; i++) {
    seed ^= value.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }

  const nextBit = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return ((seed >>> 0) % 100) < 52;
  };

  const isFinderArea = (r: number, c: number) => {
    const inTopLeft = r < 8 && c < 8;
    const inTopRight = r < 8 && c >= gridSize - 8;
    const inBottomLeft = r >= gridSize - 8 && c < 8;
    return inTopLeft || inTopRight || inBottomLeft;
  };

  const isFinderFilled = (r: number, c: number) => {
    const checkBox = (row: number, col: number) => {
      if (row === 7 || col === 7) return false; // quiet separator
      if (row === 0 || row === 6 || col === 0 || col === 6) return true;
      if (row >= 2 && row <= 4 && col >= 2 && col <= 4) return true;
      return false;
    };

    if (r < 8 && c < 8) return checkBox(r, c);
    if (r < 8 && c >= gridSize - 8) return checkBox(r, gridSize - 1 - c);
    if (r >= gridSize - 8 && c < 8) return checkBox(gridSize - 1 - r, c);
    return false;
  };

  const cells: { r: number; c: number }[] = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      let filled = false;
      if (isFinderArea(r, c)) {
        filled = isFinderFilled(r, c);
      } else if (r === 6 || c === 6) {
        filled = (r + c) % 2 === 0;
      } else {
        filled = nextBit();
      }
      if (filled) {
        cells.push({ r, c });
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${gridSize + 2} ${gridSize + 2}`}
      className={`bg-white rounded-lg ${className}`}
      role="img"
      aria-label={`QR verification code for ${value}`}
    >
      <rect width={gridSize + 2} height={gridSize + 2} fill="#FFFFFF" rx="1" />
      {cells.map(({ r, c }) => (
        <rect key={`${r}-${c}`} x={c + 1} y={r + 1} width={1} height={1} fill="#000000" />
      ))}
    </svg>
  );
};
