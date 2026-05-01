"use client";

import Link from "next/link";
import styled from "styled-components";

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  letter-spacing: 0.02em;
`;

const Root = styled(Link)`
  color: ${({ theme }) => theme.ink[3]};
  transition: color 0.12s ease;

  &:hover {
    color: ${({ theme }) => theme.ink[1]};
  }

  &:focus-visible {
    outline: 1.5px solid ${({ theme }) => theme.ink[1]};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radius.default};
  }
`;

const Sep = styled.span`
  color: ${({ theme }) => theme.ink[4]};
  user-select: none;
`;

const Leaf = styled.span`
  color: ${({ theme }) => theme.ink[1]};
`;

type Props = {
  rootLabel?: string;
  rootHref?: string;
  leaf: string;
};

export default function Breadcrumb({
  rootLabel = "directory",
  rootHref = "/tree",
  leaf,
}: Props) {
  return (
    <Row aria-label="Breadcrumb">
      <Root href={rootHref}>{rootLabel}</Root>
      <Sep>/</Sep>
      <Leaf>{leaf}</Leaf>
    </Row>
  );
}
