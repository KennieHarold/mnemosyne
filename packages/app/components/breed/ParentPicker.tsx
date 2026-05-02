"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { glyphForLabel, labelFromAgent, type Agent } from "@/lib/agent";

type Props = {
  open: boolean;
  slot: 1 | 2;
  agents: Agent[];
  selectedLabel: string;
  excludeLabel: string;
  onSelect: (label: string) => void;
  onClose: () => void;
};

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(4, 6, 12, 0.72);
  backdrop-filter: blur(4px);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const Card = styled.div`
  width: min(560px, 100%);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.bg.base};
  border: 0.5px solid ${({ theme }) => theme.line.strong};
  border-radius: ${({ theme }) => theme.radius.card};
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
  overflow: hidden;
`;

const Head = styled.header`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 12px;
  border-bottom: 0.5px solid ${({ theme }) => theme.line.faint};
`;

const TitleStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Comment = styled.span`
  font-size: 9px;
  letter-spacing: 0.16em;
  color: ${({ theme }) => theme.ink[3]};
  text-transform: uppercase;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.ink[1]};
`;

const CloseBtn = styled.button`
  font-family: inherit;
  font-size: 11px;
  background: transparent;
  color: ${({ theme }) => theme.ink[2]};
  border: 0.5px solid ${({ theme }) => theme.line.default};
  border-radius: ${({ theme }) => theme.radius.default};
  padding: 5px 10px;
  cursor: pointer;
  letter-spacing: 0.04em;

  &:hover {
    color: ${({ theme }) => theme.ink[1]};
    border-color: ${({ theme }) => theme.line.strong};
  }
`;

const SearchWrap = styled.div`
  padding: 10px 18px;
  border-bottom: 0.5px solid ${({ theme }) => theme.line.faint};
`;

const Search = styled.input`
  width: 100%;
  font-family: inherit;
  font-size: 11px;
  padding: 8px 10px;
  background: rgba(14, 18, 32, 0.6);
  color: ${({ theme }) => theme.ink[1]};
  border: 0.5px solid ${({ theme }) => theme.line.default};
  border-radius: ${({ theme }) => theme.radius.default};
  outline: none;

  &::placeholder {
    color: ${({ theme }) => theme.ink[3]};
  }

  &:focus {
    border-color: ${({ theme }) => theme.line.strong};
  }
`;

const List = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 6px;
`;

const Row = styled.button<{ $selected: boolean; $disabled: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: left;
  font-family: inherit;
  padding: 10px 12px;
  background: ${({ $selected }) =>
    $selected ? "rgba(93, 202, 165, 0.08)" : "transparent"};
  border: 0.5px solid
    ${({ $selected }) =>
      $selected ? "rgba(93, 202, 165, 0.4)" : "transparent"};
  border-radius: ${({ theme }) => theme.radius.default};
  color: inherit;
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
  opacity: ${({ $disabled }) => ($disabled ? 0.35 : 1)};
  margin-bottom: 2px;

  &:hover {
    background: ${({ $disabled }) =>
      $disabled ? "transparent" : "rgba(20, 24, 34, 0.85)"};
  }

  &:focus-visible {
    outline: 1px solid ${({ theme }) => theme.ink[1]};
    outline-offset: -1px;
  }
`;

const Glyph = styled.span`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  border-radius: ${({ theme }) => theme.radius.default};
  font-size: 14px;
  color: ${({ theme }) => theme.ink[1]};
  flex-shrink: 0;
`;

const Body = styled.div`
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Name = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.ink[1]};
`;

const Ens = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.ink[2]};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Tag = styled.span`
  font-size: 9px;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.ink[3]};
  font-variant-numeric: tabular-nums;
`;

const Empty = styled.div`
  padding: 32px;
  text-align: center;
  font-size: 11px;
  color: ${({ theme }) => theme.ink[3]};
`;

export default function ParentPicker({
  open,
  slot,
  agents,
  selectedLabel,
  excludeLabel,
  onSelect,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter((a) => {
      const label = labelFromAgent(a).toLowerCase();
      const name = a.name.toLowerCase();
      return label.includes(q) || name.includes(q);
    });
  }, [agents, query]);

  if (!open) return null;

  return (
    <Backdrop onMouseDown={onClose}>
      <Card onMouseDown={(e) => e.stopPropagation()}>
        <Head>
          <TitleStack>
            <Comment>{`// SELECT PARENT ${slot}`}</Comment>
            <Title>choose an agent</Title>
          </TitleStack>
          <CloseBtn type="button" onClick={onClose}>
            esc · close
          </CloseBtn>
        </Head>
        <SearchWrap>
          <Search
            autoFocus
            placeholder="search by name or label…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </SearchWrap>
        <List>
          {filtered.length === 0 ? (
            <Empty>no agents match</Empty>
          ) : (
            filtered.map((a) => {
              const label = labelFromAgent(a);
              const isSelected = label === selectedLabel;
              const isExcluded = label === excludeLabel;
              return (
                <Row
                  key={a.tokenId.toString()}
                  type="button"
                  $selected={isSelected}
                  $disabled={isExcluded}
                  disabled={isExcluded}
                  onClick={() => {
                    if (isExcluded) return;
                    onSelect(label);
                  }}
                >
                  <Glyph aria-hidden>{a.glyph || glyphForLabel(label)}</Glyph>
                  <Body>
                    <Name>{a.name || label}</Name>
                    <Ens>{a.ens || `${label}.mnemo.eth`}</Ens>
                  </Body>
                  <Tag>
                    {isExcluded
                      ? "other parent"
                      : `gen·${a.generation
                          .toString()
                          .padStart(2, "0")}`}
                  </Tag>
                </Row>
              );
            })
          )}
        </List>
      </Card>
    </Backdrop>
  );
}
