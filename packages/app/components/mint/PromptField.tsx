"use client";

import { useEffect, useRef } from "react";
import styled from "styled-components";

const Wrap = styled.div`
  position: relative;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 96px;
  resize: vertical;
  background: ${({ theme }) => theme.bg[3]};
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  border-radius: ${({ theme }) => theme.radius.card};
  padding: 14px 70px 14px 14px;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  color: ${({ theme }) => theme.ink[1]};
  letter-spacing: -0.005em;
  transition: border-color 0.12s ease;

  &::placeholder {
    color: ${({ theme }) => theme.ink[3]};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.line.strong};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Count = styled.span<{ $over: boolean }>`
  position: absolute;
  top: 10px;
  right: 12px;
  font-size: 9px;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $over }) => ($over ? "#ef9f9f" : theme.ink[3])};
`;

const PlaceholderCursor = styled.span`
  display: inline-block;
  width: 6px;
  height: 12px;
  background: ${({ theme }) => theme.ink[2]};
  vertical-align: -1px;
  margin-left: 4px;
  animation: blink 1s steps(2) infinite;

  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
`;

const PlaceholderOverlay = styled.div`
  position: absolute;
  top: 14px;
  left: 14px;
  font-size: 14px;
  line-height: 1.5;
  color: ${({ theme }) => theme.ink[3]};
  pointer-events: none;
  letter-spacing: -0.005em;
`;

type Props = {
  value: string;
  onChange: (next: string) => void;
  maxLength: number;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
};

export default function PromptField({
  value,
  onChange,
  maxLength,
  disabled,
  placeholder = "describe a character in one sentence",
  autoFocus,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const over = value.length > maxLength;

  return (
    <Wrap>
      <TextArea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        maxLength={maxLength}
        disabled={disabled}
        spellCheck={false}
        aria-label="character prompt"
      />
      {value.length === 0 && (
        <PlaceholderOverlay aria-hidden>
          {placeholder}
          <PlaceholderCursor />
        </PlaceholderOverlay>
      )}
      <Count $over={over}>
        {value.length} / {maxLength}
      </Count>
    </Wrap>
  );
}
