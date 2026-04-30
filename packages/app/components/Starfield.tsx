"use client";

import styled from "styled-components";

const Svg = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.6;
  pointer-events: none;
`;

const SMALL_STARS: Array<[number, number, number]> = [
  [42, 38, 0.5],
  [128, 22, 0.45],
  [212, 54, 0.55],
  [298, 30, 0.4],
  [364, 70, 0.5],
  [440, 28, 0.6],
  [510, 86, 0.45],
  [78, 110, 0.5],
  [186, 138, 0.55],
  [264, 168, 0.4],
  [338, 122, 0.5],
  [402, 160, 0.65],
  [486, 144, 0.45],
  [560, 116, 0.5],
  [98, 198, 0.7],
];

const LARGE_STARS: Array<[number, number]> = [
  [156, 76],
  [388, 32],
  [462, 192],
];

export default function Starfield() {
  return (
    <Svg
      viewBox="0 0 600 240"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      {SMALL_STARS.map(([cx, cy, r], i) => (
        <circle key={`s-${i}`} cx={cx} cy={cy} r={r} fill="#FFFFFF" />
      ))}
      {LARGE_STARS.map(([cx, cy], i) => (
        <circle key={`l-${i}`} cx={cx} cy={cy} r={1} fill="#8FA4C2" />
      ))}
    </Svg>
  );
}
