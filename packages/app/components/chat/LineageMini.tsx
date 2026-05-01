"use client";

import { useRouter } from "next/navigation";
import styled from "styled-components";
import type { LineageParent } from "@/lib/chat";

const Wrap = styled.div`
  width: 100%;
`;

const Foot = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  color: ${({ theme }) => theme.ink[3]};
  margin-top: 4px;
  letter-spacing: 0.04em;
`;

const ParentGroup = styled.g`
  cursor: pointer;

  & > circle {
    transition: stroke 0.18s ease;
  }

  &:hover > circle.ring,
  &:focus-visible > circle.ring {
    stroke: ${({ theme }) => theme.signal.live};
  }

  &:focus-visible {
    outline: none;
  }
`;

type Props = {
  parents: LineageParent[];
  selfName: string;
  selfGlyph: string;
  childCount: number;
  descendantCount?: number;
};

export default function LineageMini({
  parents,
  selfName,
  selfGlyph,
  childCount,
  descendantCount,
}: Props) {
  const router = useRouter();
  const left = parents[0];
  const right = parents[1];
  const hasParents = parents.length > 0;

  function go(label: string) {
    router.push(`/chat/${label}`);
  }

  return (
    <Wrap>
      <svg
        viewBox="0 0 264 86"
        width="100%"
        height="86"
        style={{ display: "block" }}
        role="img"
        aria-label={`Lineage for ${selfName}`}
      >
        <g
          stroke="rgba(143, 164, 194, 0.4)"
          strokeWidth="0.5"
          fill="none"
          aria-hidden
        >
          {left && <path d="M 60 20 Q 100 40 130 56" />}
          {right && <path d="M 200 20 Q 160 40 130 56" />}
        </g>
        <g fontFamily="ui-monospace, monospace">
          {left && (
            <ParentGroup
              role="button"
              tabIndex={0}
              onClick={() => go(left.label)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  go(left.label);
                }
              }}
              aria-label={`Open chat with parent ${left.name}`}
            >
              <circle
                className="ring"
                cx="60"
                cy="20"
                r="13"
                fill="#0E1220"
                stroke="#E8ECF1"
                strokeWidth="0.5"
              />
              <text
                x="60"
                y="24"
                textAnchor="middle"
                fontSize="10"
                fill="#E8ECF1"
              >
                {left.glyph}
              </text>
              <text
                x="60"
                y="48"
                textAnchor="middle"
                fontSize="9"
                fill="#8FA4C2"
              >
                {left.name.toLowerCase()}
              </text>
            </ParentGroup>
          )}
          {right && (
            <ParentGroup
              role="button"
              tabIndex={0}
              onClick={() => go(right.label)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  go(right.label);
                }
              }}
              aria-label={`Open chat with parent ${right.name}`}
            >
              <circle
                className="ring"
                cx="200"
                cy="20"
                r="13"
                fill="#0E1220"
                stroke="#E8ECF1"
                strokeWidth="0.5"
              />
              <text
                x="200"
                y="24"
                textAnchor="middle"
                fontSize="10"
                fill="#E8ECF1"
              >
                {right.glyph}
              </text>
              <text
                x="200"
                y="48"
                textAnchor="middle"
                fontSize="9"
                fill="#8FA4C2"
              >
                {right.name.toLowerCase()}
              </text>
            </ParentGroup>
          )}
          <g>
            <circle cx="130" cy="56" r="14" fill="#E8ECF1" />
            <text
              x="130"
              y="60"
              textAnchor="middle"
              fontSize="10"
              fill="#07080C"
            >
              {selfGlyph}
            </text>
            <text
              x="130"
              y="82"
              textAnchor="middle"
              fontSize="9"
              fill="#E8ECF1"
              fontWeight="500"
            >
              {selfName.toLowerCase()}
            </text>
          </g>
        </g>
      </svg>
      <Foot>
        <span>{hasParents ? `${parents.length} parents` : "genesis"}</span>
        <span>
          {childCount} children
          {typeof descendantCount === "number"
            ? ` · ${descendantCount} descendants`
            : ""}
        </span>
      </Foot>
    </Wrap>
  );
}
