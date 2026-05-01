"use client";

import {
  forwardRef,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import styled from "styled-components";

const Form = styled.form`
  padding: 14px 20px 16px;
  border-top: 0.5px solid ${({ theme }) => theme.line.default};
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(10, 12, 18, 0.4);
`;

const Prompt = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.ink[3]};
  padding-bottom: 2px;
`;

const Input = styled.input`
  flex: 1;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  outline: none;
  color: ${({ theme }) => theme.ink[1]};
  padding: 4px 0;

  &::placeholder {
    color: ${({ theme }) => theme.ink[4]};
  }

  &:disabled {
    opacity: 0.6;
  }
`;

const Cost = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.ink[3]};
  letter-spacing: 0.04em;
  white-space: nowrap;
`;

const Chip = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.ink[3]};
  padding: 4px 8px;
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  border-radius: ${({ theme }) => theme.radius.chip};
  letter-spacing: 0.04em;
`;

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  placeholder?: string;
  costLabel?: string;
  disabled?: boolean;
};

const ChatInput = forwardRef<HTMLInputElement, Props>(function ChatInput(
  {
    value,
    onChange,
    onSubmit,
    placeholder = "speak to the agent",
    costLabel = "~ 0.0001 eth · royalty splits to σ·ψ",
    disabled,
  },
  ref,
) {
  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submit();
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <Form onSubmit={handleSubmit}>
      <Prompt aria-hidden>{">"}</Prompt>
      <Input
        ref={ref}
        type="text"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        autoFocus
        disabled={disabled}
        aria-label="Message"
      />
      <Cost>{costLabel}</Cost>
      <Chip aria-hidden>⌘ ↵</Chip>
    </Form>
  );
});

export default ChatInput;
