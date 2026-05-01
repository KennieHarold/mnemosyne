"use client";

import styled from "styled-components";

const Row = styled.div`
  padding: 10px 20px;
  border-top: 0.5px solid ${({ theme }) => theme.line.faint};
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
`;

const Label = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.ink[3]};
  letter-spacing: 0.08em;
  margin-right: 4px;
`;

const Pill = styled.button`
  font-family: inherit;
  font-size: 10px;
  padding: 4px 10px;
  background: transparent;
  color: ${({ theme }) => theme.ink[2]};
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  border-radius: ${({ theme }) => theme.radius.chip};
  letter-spacing: 0.02em;
  transition: color 0.12s ease, border-color 0.12s ease;

  &:hover {
    color: ${({ theme }) => theme.ink[1]};
    border-color: ${({ theme }) => theme.line.strong};
  }

  &:focus-visible {
    border: 1.5px solid ${({ theme }) => theme.ink[1]};
    padding: 2.5px 8.5px;
  }
`;

type Props = {
  suggestions: string[];
  onPick: (text: string) => void;
};

export default function SuggestionBar({ suggestions, onPick }: Props) {
  if (suggestions.length === 0) return null;
  return (
    <Row>
      <Label>{"// SUGGEST"}</Label>
      {suggestions.map((s) => (
        <Pill key={s} type="button" onClick={() => onPick(s)}>
          {s}
        </Pill>
      ))}
    </Row>
  );
}
