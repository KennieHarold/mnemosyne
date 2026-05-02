"use client";

import styled from "styled-components";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { isValidLabel, normalizeLabel } from "../lib/label";

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 20px 60px;
  gap: 28px;
`;

const Comment = styled.div`
  font-size: 9px;
  color: ${({ theme }) => theme.ink[3]};
  letter-spacing: 0.08em;
`;

const Knot = styled.div`
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0.5px solid ${({ theme }) => theme.line.default};
  border-radius: 50%;

  svg {
    width: 28px;
    height: 28px;
  }
`;

const Hero = styled.h1`
  margin: 0;
  font-size: 30px;
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: -0.01em;
  text-align: center;
  color: ${({ theme }) => theme.ink[1]};
  max-width: 560px;
`;

const Subhead = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  text-align: center;
  color: ${({ theme }) => theme.ink[2]};
  max-width: 440px;
`;

const SearchForm = styled.form`
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SearchRow = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: ${({ theme }) => theme.bg[1]};
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  border-radius: ${({ theme }) => theme.radius.card};

  &:focus-within {
    border-color: ${({ theme }) => theme.line.strong};
  }
`;

const Caret = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.ink[3]};
`;

const Input = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 13px;
  color: ${({ theme }) => theme.ink[1]};

  &::placeholder {
    color: ${({ theme }) => theme.ink[4]};
  }
`;

const Suffix = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.ink[3]};
`;

const SubmitChip = styled.button`
  font-size: 9px;
  letter-spacing: 0.06em;
  padding: 4px 8px;
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  border-radius: ${({ theme }) => theme.radius.chip};
  background: transparent;
  color: ${({ theme }) => theme.ink[2]};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.ink[1]};
    border-color: ${({ theme }) => theme.line.strong};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const Hint = styled.div`
  font-size: 9px;
  color: ${({ theme }) => theme.ink[4]};
  letter-spacing: 0.04em;
  padding-left: 4px;
`;

const Examples = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
`;

const ExampleLabel = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.ink[3]};
`;

const ExamplePill = styled.button`
  font-size: 10px;
  padding: 4px 8px;
  background: transparent;
  border: 0.5px solid ${({ theme }) => theme.line.default};
  border-radius: ${({ theme }) => theme.radius.chip};
  color: ${({ theme }) => theme.ink[2]};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.ink[1]};
    border-color: ${({ theme }) => theme.line.medium};
  }
`;

const ErrorLine = styled.div`
  font-size: 10px;
  color: #d57171;
  padding-left: 4px;
`;

function KnotMark() {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="14" r="6" stroke="#E8ECF1" strokeWidth="0.6" />
      <circle cx="18" cy="14" r="6" stroke="#E8ECF1" strokeWidth="0.6" />
    </svg>
  );
}

const EXAMPLES = ["augustus", "socrates", "marcus"];

export default function Home() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (raw: string) => {
    const label = normalizeLabel(raw);
    if (!label) {
      setError("type a name to search");
      return;
    }
    if (!isValidLabel(label)) {
      setError("name must be a-z, 0-9, or hyphens (not at edges)");
      return;
    }
    setError(null);
    router.push(`/agent/${label}`);
  };

  return (
    <Wrap>
      <Comment>{"// LOOKUP · ENS TEXT RECORDS · mnemo.eth"}</Comment>
      <Knot>
        <KnotMark />
      </Knot>
      <Hero>
        Resolve a mnemo agent
        <br />
        from its ENS name.
      </Hero>
      <Subhead>
        Search for a subname under <code>mnemo.eth</code>. We pull the
        agent&apos;s text records — generation, tagline, traits, parents,
        children — directly from ENS.
      </Subhead>

      <SearchForm
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
      >
        <SearchRow>
          <Caret>{">"}</Caret>
          <Input
            autoFocus
            placeholder="augustus"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            spellCheck={false}
            autoComplete="off"
          />
          <Suffix>.mnemo.eth</Suffix>
          <SubmitChip type="submit" disabled={!value.trim()}>
            resolve →
          </SubmitChip>
        </SearchRow>
        <Hint>
          {
            "// queries text(generation) · text(tagline) · text(traits) · text(parents) · text(children)"
          }
        </Hint>
        {error && <ErrorLine>{`// ${error}`}</ErrorLine>}
      </SearchForm>

      <Examples>
        <ExampleLabel>try:</ExampleLabel>
        {EXAMPLES.map((ex) => (
          <ExamplePill
            key={ex}
            type="button"
            onClick={() => {
              setValue(ex);
              submit(ex);
            }}
          >
            {ex}.mnemo.eth
          </ExamplePill>
        ))}
      </Examples>
    </Wrap>
  );
}
