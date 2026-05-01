"use client";

import styled from "styled-components";
import { glyphForLabel } from "@/lib/agent";

type Props = {
  parent1Label: string;
  parent2Label: string;
};

const Card = styled.div`
  background: ${({ theme }) => theme.bg[3]};
  border: 0.5px solid ${({ theme }) => theme.line.default};
  border-radius: ${({ theme }) => theme.radius.card};
  padding: 12px 14px;
`;

const Comment = styled.div`
  font-size: 9px;
  color: ${({ theme }) => theme.ink[3]};
  letter-spacing: 0.12em;
  margin-bottom: 8px;
`;

const Rows = styled.div`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10px;
  line-height: 1.8;
  display: flex;
  flex-direction: column;
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
`;

const Label = styled.span`
  color: ${({ theme }) => theme.ink[2]};
`;

const Pct = styled.span<{ $accent?: boolean }>`
  color: ${({ theme, $accent }) =>
    $accent ? theme.signal.live : theme.ink[1]};
  font-variant-numeric: tabular-nums;
`;

export default function RoyaltySplit({ parent1Label, parent2Label }: Props) {
  return (
    <Card>
      <Comment>{"// ROYALTY SPLIT · ALL FUTURE INVOCATIONS"}</Comment>
      <Rows>
        <Row>
          <Label>{`${parent1Label} owner · ${glyphForLabel(parent1Label)}`}</Label>
          <Pct>35%</Pct>
        </Row>
        <Row>
          <Label>{`${parent2Label} owner · ${glyphForLabel(parent2Label)}`}</Label>
          <Pct>35%</Pct>
        </Row>
        <Row>
          <Label>protocol</Label>
          <Pct>10%</Pct>
        </Row>
        <Row>
          <Label>child owner · you</Label>
          <Pct $accent>20%</Pct>
        </Row>
      </Rows>
    </Card>
  );
}
