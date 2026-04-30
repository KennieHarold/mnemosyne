"use client";

import styled from "styled-components";
import { useReactFlow } from "@xyflow/react";

const Stack = styled.div`
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Btn = styled.button`
  width: 22px;
  height: 24px;
  background: ${({ theme }) => theme.bg[1]};
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  border-radius: ${({ theme }) => theme.radius.chip};
  color: ${({ theme }) => theme.ink[2]};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    color 0.12s ease,
    border-color 0.12s ease;

  &:hover {
    color: ${({ theme }) => theme.ink[1]};
    border-color: ${({ theme }) => theme.line.strong};
  }

  &:focus-visible {
    border: 1.5px solid ${({ theme }) => theme.ink[1]};
  }
`;

type Props = {
  onFit?: () => void;
};

export default function ZoomControls({ onFit }: Props) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const handleFit =
    onFit ?? (() => fitView({ duration: 200, padding: 0.15 }));
  return (
    <Stack role="group" aria-label="Zoom controls">
      <Btn
        type="button"
        aria-label="Zoom in"
        onClick={() => zoomIn({ duration: 200 })}
      >
        +
      </Btn>
      <Btn
        type="button"
        aria-label="Zoom out"
        onClick={() => zoomOut({ duration: 200 })}
      >
        -
      </Btn>
      <Btn type="button" aria-label="Fit to view" onClick={handleFit}>
        ⌖
      </Btn>
    </Stack>
  );
}
