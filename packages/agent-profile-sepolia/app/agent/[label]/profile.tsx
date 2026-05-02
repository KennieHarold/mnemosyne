"use client";

import styled from "styled-components";
import Link from "next/link";
import {
  AgentRecords,
  displayName,
  ensFor,
  glyphFor,
  parseList,
} from "../../../lib/label";

const Wrap = styled.div`
  padding: 24px 20px 60px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 880px;
  width: 100%;
  margin: 0 auto;
`;

const Crumbs = styled.nav`
  font-size: 10px;
  color: ${({ theme }) => theme.ink[3]};
  display: flex;
  gap: 8px;
  align-items: center;

  a:hover {
    color: ${({ theme }) => theme.ink[1]};
  }

  span.sep {
    color: ${({ theme }) => theme.ink[4]};
  }

  span.leaf {
    color: ${({ theme }) => theme.ink[1]};
  }
`;

const Comment = styled.div`
  font-size: 9px;
  color: ${({ theme }) => theme.ink[3]};
  letter-spacing: 0.08em;
`;

const Hero = styled.section`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: ${({ theme }) => theme.bg[1]};
  border: 0.5px solid ${({ theme }) => theme.line.default};
  border-radius: ${({ theme }) => theme.radius.card};
`;

const Glyph = styled.div`
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  border-radius: ${({ theme }) => theme.radius.default};
  background: ${({ theme }) => theme.bg[2]};
  color: ${({ theme }) => theme.ink[1]};
  font-size: 24px;
`;

const HeroText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Name = styled.h1`
  margin: 0;
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.ink[1]};
`;

const Ens = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.ink[2]};
`;

const Holder = styled.a`
  font-size: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: ${({ theme }) => theme.ink[3]};

  &:hover {
    color: ${({ theme }) => theme.ink[1]};
  }
`;

function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const TaglineCallout = styled.blockquote`
  margin: 0;
  padding: 10px 14px;
  border-left: 0.5px solid ${({ theme }) => theme.line.medium};
  color: ${({ theme }) => theme.ink[2]};
  font-size: 12px;
  line-height: 1.6;
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SectionLabel = styled.div`
  font-size: 9px;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.ink[3]};
`;

const Card = styled.div`
  background: ${({ theme }) => theme.bg[1]};
  border: 0.5px solid ${({ theme }) => theme.line.default};
  border-radius: ${({ theme }) => theme.radius.card};
  padding: 14px 16px;
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: ${({ theme }) => theme.line.faint};
  border: 0.5px solid ${({ theme }) => theme.line.default};
  border-radius: ${({ theme }) => theme.radius.card};
  overflow: hidden;
`;

const StatCell = styled.div`
  background: ${({ theme }) => theme.bg[1]};
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const StatKey = styled.span`
  font-size: 9px;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.ink[3]};
`;

const StatValue = styled.span`
  font-size: 16px;
  color: ${({ theme }) => theme.ink[1]};
`;

const StatHint = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.ink[4]};
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Chip = styled.span`
  font-size: 10px;
  padding: 4px 8px;
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  border-radius: ${({ theme }) => theme.radius.chip};
  color: ${({ theme }) => theme.ink[2]};
`;

const RecordTable = styled.div`
  display: grid;
  grid-template-columns: 110px 1fr;
  row-gap: 10px;
  column-gap: 16px;
  font-size: 11px;
`;

const RecKey = styled.div`
  color: ${({ theme }) => theme.ink[3]};
  letter-spacing: 0.04em;
`;

const RecValue = styled.div`
  color: ${({ theme }) => theme.ink[1]};
  word-break: break-word;
  white-space: pre-wrap;
`;

const Empty = styled.span`
  color: ${({ theme }) => theme.ink[4]};
`;

const NotFoundCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 20px;
  border: 0.5px solid ${({ theme }) => theme.line.default};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.bg[1]};
  text-align: center;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: ${({ theme }) => theme.ink[1]};
`;

const Body = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.ink[2]};
  max-width: 320px;
  line-height: 1.7;
`;

const BackLink = styled(Link)`
  font-size: 10px;
  padding: 8px 12px;
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  border-radius: ${({ theme }) => theme.radius.chip};
  color: ${({ theme }) => theme.ink[2]};

  &:hover {
    color: ${({ theme }) => theme.ink[1]};
    border-color: ${({ theme }) => theme.line.strong};
  }
`;

function ProfileCrumbs({ label }: { label: string }) {
  return (
    <Crumbs>
      <Link href="/">lookup</Link>
      <span className="sep">/</span>
      <span className="leaf">{ensFor(label)}</span>
    </Crumbs>
  );
}

export default function AgentProfile({
  label,
  records,
}: {
  label: string;
  records: AgentRecords | null;
}) {
  if (!records) {
    return (
      <Wrap>
        <ProfileCrumbs label={label} />
        <Comment>{"// AGENT · NOT RESOLVED"}</Comment>
        <NotFoundCard>
          <Title>No records found</Title>
          <Body>
            <code>{ensFor(label)}</code> {"  "}doesn&apos;t have any text
            records on ENS yet, or the resolver couldn&apos;t reach the gateway.
          </Body>
          <BackLink href="/">← back to lookup</BackLink>
        </NotFoundCard>
      </Wrap>
    );
  }

  const traits = parseList(records.traits);
  const parents = parseList(records.parents);
  const children = parseList(records.children);
  const generation = records.generation || "—";

  return (
    <Wrap>
      <ProfileCrumbs label={label} />
      <Comment>
        {"// AGENT · ENS RESOLVED · text records via mnemo.eth"}
      </Comment>

      <Hero>
        <Glyph>{glyphFor(label)}</Glyph>
        <HeroText>
          <Name>{displayName(label)}</Name>
          <Ens>{ensFor(label)}</Ens>
          {records.address && (
            <Holder
              href={`https://sepolia.etherscan.io/address/${records.address}`}
              target="_blank"
              rel="noopener noreferrer"
              title={records.address}
            >
              holder · {shortAddress(records.address)} ↗
            </Holder>
          )}
        </HeroText>
      </Hero>

      {records.tagline && <TaglineCallout>{records.tagline}</TaglineCallout>}

      <StatGrid>
        <StatCell>
          <StatKey>GEN</StatKey>
          <StatValue>{generation}</StatValue>
          <StatHint>generation</StatHint>
        </StatCell>
        <StatCell>
          <StatKey>TRAITS</StatKey>
          <StatValue>{traits.length || "—"}</StatValue>
          <StatHint>declared</StatHint>
        </StatCell>
        <StatCell>
          <StatKey>PARENTS</StatKey>
          <StatValue>{parents.length || "—"}</StatValue>
          <StatHint>lineage</StatHint>
        </StatCell>
        <StatCell>
          <StatKey>KIDS</StatKey>
          <StatValue>{children.length || "—"}</StatValue>
          <StatHint>descendants</StatHint>
        </StatCell>
      </StatGrid>

      {traits.length > 0 && (
        <Section>
          <SectionLabel>{"// TRAITS"}</SectionLabel>
          <ChipRow>
            {traits.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </ChipRow>
        </Section>
      )}

      {parents.length > 0 && (
        <Section>
          <SectionLabel>{"// PARENTS"}</SectionLabel>
          <ChipRow>
            {parents.map((p) => (
              <Chip key={p}>token #{p}</Chip>
            ))}
          </ChipRow>
        </Section>
      )}

      {children.length > 0 && (
        <Section>
          <SectionLabel>{"// CHILDREN"}</SectionLabel>
          <ChipRow>
            {children.map((c) => (
              <Chip key={c}>token #{c}</Chip>
            ))}
          </ChipRow>
        </Section>
      )}

      <Section>
        <SectionLabel>{"// RAW TEXT RECORDS"}</SectionLabel>
        <Card>
          <RecordTable>
            <RecKey>holder</RecKey>
            <RecValue>{records.address || <Empty>not set</Empty>}</RecValue>
            <RecKey>generation</RecKey>
            <RecValue>{records.generation || <Empty>not set</Empty>}</RecValue>
            <RecKey>tagline</RecKey>
            <RecValue>{records.tagline || <Empty>not set</Empty>}</RecValue>
            <RecKey>traits</RecKey>
            <RecValue>{records.traits || <Empty>not set</Empty>}</RecValue>
            <RecKey>parents</RecKey>
            <RecValue>{records.parents || <Empty>not set</Empty>}</RecValue>
            <RecKey>children</RecKey>
            <RecValue>{records.children || <Empty>not set</Empty>}</RecValue>
          </RecordTable>
        </Card>
      </Section>
    </Wrap>
  );
}
