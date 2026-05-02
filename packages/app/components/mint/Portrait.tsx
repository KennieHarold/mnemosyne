"use client";

const COLORS = ["#5DCAA5", "#8FA4C2", "#E8ECF1", "#6B7B95", "#BA7517"];

type Props = {
  seed: number;
  size?: number;
};

export default function Portrait({ seed, size = 64 }: Props) {
  const stroke = COLORS[seed % COLORS.length];
  const accent = COLORS[(seed >> 4) % COLORS.length];
  const r1 = 14 + (seed % 8);
  const r2 = 6 + ((seed >> 5) % 6);
  const offset = ((seed >> 8) % 12) - 6;

  return (
    <svg
      width={size}
      height={size}
      viewBox="-32 -32 64 64"
      role="img"
      aria-label="Deterministic agent portrait"
    >
      <circle
        r={26}
        fill="#0A0C12"
        stroke="rgba(120, 140, 180, 0.25)"
        strokeWidth="0.5"
      />
      <circle
        r={r1}
        cx={offset}
        cy={-offset / 2}
        fill="none"
        stroke={stroke}
        strokeWidth="0.5"
        opacity="0.7"
      />
      <circle
        r={r2}
        cx={-offset}
        cy={offset}
        fill="none"
        stroke={accent}
        strokeWidth="0.5"
        opacity="0.85"
      />
      <line
        x1={-22}
        y1={offset}
        x2={22}
        y2={-offset}
        stroke={stroke}
        strokeWidth="0.5"
        opacity="0.4"
      />
    </svg>
  );
}
