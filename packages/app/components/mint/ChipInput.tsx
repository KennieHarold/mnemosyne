"use client";

import { useRef, useState } from "react";
import styled from "styled-components";

const Box = styled.div<{ $disabled?: boolean }>`
  background: ${({ theme }) => theme.bg[3]};
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  border-radius: ${({ theme }) => theme.radius.card};
  padding: 8px 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 38px;
  align-items: center;
  cursor: text;
  transition: border-color 0.12s ease;
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};

  &:focus-within {
    border-color: ${({ theme }) => theme.line.strong};
  }
`;

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: ${({ theme }) => theme.ink[1]};
  background: ${({ theme }) => theme.bg[2]};
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  border-radius: ${({ theme }) => theme.radius.chip};
  padding: 3px 8px;
`;

const Remove = styled.button`
  font-family: inherit;
  font-size: 10px;
  color: ${({ theme }) => theme.ink[3]};
  background: transparent;
  border: 0;
  padding: 0;
  margin: 0;
  cursor: pointer;
  line-height: 1;

  &:hover {
    color: ${({ theme }) => theme.ink[1]};
  }
`;

const Input = styled.input`
  flex: 1;
  min-width: 80px;
  background: transparent;
  border: 0;
  outline: none;
  padding: 4px 2px;
  font-family: inherit;
  font-size: 12px;
  color: ${({ theme }) => theme.ink[1]};

  &::placeholder {
    color: ${({ theme }) => theme.ink[3]};
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

type Props = {
  values: string[];
  onChange: (next: string[]) => void;
  max: number;
  perChipMax?: number;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
};

export default function ChipInput({
  values,
  onChange,
  max,
  perChipMax = 36,
  placeholder = "type, press enter",
  disabled,
  ariaLabel,
}: Props) {
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  const commit = (raw: string) => {
    const trimmed = raw.trim().slice(0, perChipMax);
    if (!trimmed) return;
    if (values.length >= max) return;
    if (values.some((v) => v.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...values, trimmed]);
    setDraft("");
  };

  const handleKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(draft);
    } else if (event.key === "Backspace" && draft === "" && values.length > 0) {
      event.preventDefault();
      onChange(values.slice(0, -1));
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text");
    if (!text.includes(",") && !text.includes("\n")) return;
    event.preventDefault();
    const parts = text
      .split(/[,\n]/)
      .map((p) => p.trim())
      .filter(Boolean);
    let next = [...values];
    for (const p of parts) {
      const cleaned = p.slice(0, perChipMax);
      if (next.length >= max) break;
      if (next.some((v) => v.toLowerCase() === cleaned.toLowerCase())) continue;
      next = [...next, cleaned];
    }
    onChange(next);
    setDraft("");
  };

  return (
    <Box
      $disabled={disabled}
      onClick={() => ref.current?.focus()}
      role="group"
      aria-label={ariaLabel}
    >
      {values.map((value, idx) => (
        <Chip key={`${value}-${idx}`}>
          {value}
          <Remove
            type="button"
            aria-label={`remove ${value}`}
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onChange(values.filter((_, i) => i !== idx));
            }}
          >
            ×
          </Remove>
        </Chip>
      ))}
      <Input
        ref={ref}
        value={draft}
        onChange={(event) => setDraft(event.target.value.slice(0, perChipMax))}
        onKeyDown={handleKey}
        onPaste={handlePaste}
        onBlur={() => commit(draft)}
        placeholder={values.length >= max ? "" : placeholder}
        disabled={disabled || values.length >= max}
        spellCheck={false}
      />
    </Box>
  );
}
