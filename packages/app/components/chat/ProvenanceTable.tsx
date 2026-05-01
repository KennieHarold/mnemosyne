"use client";

import styled from "styled-components";
import type { AgentProvenance } from "@/lib/chat";

const Table = styled.div`
  font-size: 10px;
  line-height: 1.9;
  color: ${({ theme }) => theme.ink[2]};
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
`;

const Value = styled.span`
  color: ${({ theme }) => theme.ink[1]};
  font-variant-numeric: tabular-nums;
`;

const Tee = styled.span`
  color: ${({ theme }) => theme.signal.live};
`;

type Props = {
  provenance: AgentProvenance;
};

export default function ProvenanceTable({ provenance }: Props) {
  return (
    <Table>
      <Row>
        <span>iNFT</span>
        <Value>{provenance.inft}</Value>
      </Row>
      <Row>
        <span>root</span>
        <Value>{provenance.root}</Value>
      </Row>
      <Row>
        <span>seal</span>
        <Value>{provenance.seal}</Value>
      </Row>
      <Row>
        <span>tee</span>
        <Tee>attested ✓</Tee>
      </Row>
      <Row>
        <span>owner</span>
        <Value>{provenance.owner}</Value>
      </Row>
    </Table>
  );
}
