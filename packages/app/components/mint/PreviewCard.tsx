"use client";

import styled from "styled-components";
import Portrait from "./Portrait";
import type { MintPreview } from "@/lib/mint";

const Card = styled.div`
  background: ${({ theme }) => theme.bg[1]};
  border: 0.5px solid ${({ theme }) => theme.line.default};
  border-radius: ${({ theme }) => theme.radius.card};
  padding: 14px 16px 16px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const Comment = styled.div`
  font-size: 9px;
  color: ${({ theme }) => theme.ink[3]};
  letter-spacing: 0.12em;
`;

const Status = styled.div<{ $tone: "live" | "muted" }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 9px;
  letter-spacing: 0.04em;
  color: ${({ theme, $tone }) =>
    $tone === "live" ? theme.signal.live : theme.ink[3]};
`;

const Dot = styled.span<{ $tone: "live" | "muted" }>`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${({ theme, $tone }) =>
    $tone === "live" ? theme.signal.live : theme.ink[3]};
  box-shadow: 0 0 6px
    ${({ theme, $tone }) =>
      $tone === "live" ? theme.signal.live : "transparent"};
`;

const Body = styled.div`
  display: flex;
  gap: 14px;
  align-items: flex-start;
`;

const Lines = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Line = styled.div<{ $revealed: boolean }>`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 11px;
  line-height: 1.5;
  color: ${({ theme, $revealed }) => ($revealed ? theme.ink[1] : theme.ink[4])};
  display: flex;
  gap: 6px;
  min-height: 16px;
  opacity: ${({ $revealed }) => ($revealed ? 1 : 0.5)};
  transition:
    color 0.18s ease,
    opacity 0.18s ease;
`;

const Label = styled.span`
  color: ${({ theme }) => theme.ink[3]};
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  min-width: 56px;
  padding-top: 1px;
`;

const Value = styled.span`
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
`;

const TraitRow = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const Trait = styled.span`
  font-size: 9px;
  padding: 2px 6px;
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  border-radius: ${({ theme }) => theme.radius.chip};
  color: ${({ theme }) => theme.ink[2]};
`;

const PortraitWrap = styled.div`
  width: 64px;
  height: 64px;
  flex-shrink: 0;
`;

type Props = {
  preview: MintPreview | null;
};

export default function PreviewCard({ preview }: Props) {
  const ready = preview !== null;
  return (
    <Card>
      <Header>
        <Comment>{"// PREVIEW · LIVE"}</Comment>
        <Status $tone={ready ? "live" : "muted"}>
          <Dot $tone={ready ? "live" : "muted"} />
          {ready ? "ready" : "awaiting name"}
        </Status>
      </Header>
      <Body>
        <PortraitWrap>
          <Portrait seed={preview?.seed ?? 1} size={64} />
        </PortraitWrap>
        <Lines>
          <Line $revealed={!!preview?.displayName}>
            <Label>name</Label>
            <Value>{preview?.displayName || "—"}</Value>
          </Line>
          <Line $revealed={!!preview?.ens}>
            <Label>ens</Label>
            <Value>{preview?.ens || "—"}</Value>
          </Line>
          <Line $revealed={!!preview?.traits.length}>
            <Label>traits</Label>
            <Value>
              {preview?.traits.length ? (
                <TraitRow>
                  {preview.traits.map((t) => (
                    <Trait key={t}>{t}</Trait>
                  ))}
                </TraitRow>
              ) : (
                "—"
              )}
            </Value>
          </Line>
          <Line $revealed={!!preview?.tagline}>
            <Label>tagline</Label>
            <Value>{preview?.tagline || "—"}</Value>
          </Line>
        </Lines>
      </Body>
    </Card>
  );
}
