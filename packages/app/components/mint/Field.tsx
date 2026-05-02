"use client";

import styled from "styled-components";

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 14px;
`;

const Label = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.ink[3]};
  letter-spacing: 0.12em;
`;

const Meta = styled.span<{ $over?: boolean }>`
  font-size: 9px;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $over }) => ($over ? "#ef9f9f" : theme.ink[3])};
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const Hint = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.ink[3]};
  letter-spacing: 0.02em;
`;

type Props = {
  label: React.ReactNode;
  meta?: React.ReactNode;
  metaOver?: boolean;
  hint?: React.ReactNode;
  children: React.ReactNode;
};

export default function Field({ label, meta, metaOver, hint, children }: Props) {
  return (
    <Wrap>
      <HeaderRow>
        <Label>{label}</Label>
        {meta !== undefined && <Meta $over={metaOver}>{meta}</Meta>}
      </HeaderRow>
      {children}
      {hint && <Hint>{hint}</Hint>}
    </Wrap>
  );
}

export const InputBase = styled.input`
  width: 100%;
  background: ${({ theme }) => theme.bg[3]};
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  border-radius: ${({ theme }) => theme.radius.card};
  padding: 10px 12px;
  font-family: inherit;
  font-size: 13px;
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

export const TextAreaBase = styled.textarea`
  width: 100%;
  resize: vertical;
  background: ${({ theme }) => theme.bg[3]};
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  border-radius: ${({ theme }) => theme.radius.card};
  padding: 10px 12px;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.55;
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
