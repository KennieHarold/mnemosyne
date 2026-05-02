"use client";

import { useEffect, useMemo, useRef } from "react";
import styled, { keyframes, css } from "styled-components";
import { glyphForLabel, nameFromLabel } from "@/lib/agent";
import type { AgentIntelligence, BreedPhase } from "@/lib/breed-events";

const VIEW_W = 624;
const VIEW_H = 200;
const LEFT_X = 120;
const RIGHT_X = 504;
const CENTER_X = 312;
const CENTER_Y = 100;
const NODE_R = 32;

const PARTICLE_POOL_SIZE = 32;
const SPAWN_INTERVAL_MS = 90;

type Props = {
  phase: BreedPhase;
  paused: boolean;
  parent1Label: string;
  parent2Label: string;
  parent1DisplayName?: string;
  parent2DisplayName?: string;
  child: AgentIntelligence | null;
  onParent1Click?: () => void;
  onParent2Click?: () => void;
};

type Particle = {
  active: boolean;
  fromLeft: boolean;
  startedAt: number;
  duration: number;
  yJitter: number;
};

const isMergeActive = (phase: BreedPhase): boolean =>
  phase === "merge" || phase === "encrypt";

const showsChild = (phase: BreedPhase): boolean =>
  phase === "mint" ||
  phase === "ens" ||
  phase === "complete" ||
  phase === "encrypt";

const showsConnectors = (phase: BreedPhase): boolean =>
  phase === "merge" || phase === "encrypt";

const showsHalos = (phase: BreedPhase): boolean =>
  phase === "decrypt" ||
  phase === "merge" ||
  phase === "encrypt" ||
  phase === "mint" ||
  phase === "ens";

const haloPulse = keyframes`
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.08); }
`;

const haloPulseDelayed = keyframes`
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.08); }
`;

const ringPulse = keyframes`
  0% { r: 22; opacity: 0.8; }
  100% { r: 50; opacity: 0; }
`;

const dashFlow = keyframes`
  to { stroke-dashoffset: -28; }
`;

const StageWrap = styled.div`
  position: relative;
  width: 100%;
`;

const StageSvg = styled.svg`
  display: block;
  width: 100%;
  height: 220px;
  overflow: visible;
`;

const ParentGroup = styled.g<{ $shifted: boolean; $clickable: boolean }>`
  transition: transform 1.2s cubic-bezier(0.34, 1.2, 0.64, 1);
  transform-origin: 0 0;
  ${({ $clickable }) =>
    $clickable &&
    css`
      cursor: pointer;

      & .parent-core {
        transition:
          stroke 0.18s ease,
          stroke-width 0.18s ease;
      }

      &:hover .parent-core {
        stroke: #5dcaa5;
        stroke-width: 1;
      }

      &:hover .parent-hint {
        opacity: 1;
      }
    `}
  ${({ $shifted }) =>
    $shifted &&
    css`
      &.left {
        transform: translateX(40px);
      }
      &.right {
        transform: translateX(-40px);
      }
    `}
`;

const ParentHint = styled.text`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 8px;
  fill: ${({ theme }) => theme.signal.live};
  letter-spacing: 0.12em;
  text-anchor: middle;
  opacity: 0;
  transition: opacity 0.18s ease;
`;

const PlaceholderGlyph = styled.text`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 22px;
  fill: ${({ theme }) => theme.ink[2]};
  text-anchor: middle;
`;

const PlaceholderName = styled.text`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10px;
  fill: ${({ theme }) => theme.ink[2]};
  letter-spacing: 0.04em;
`;

const HaloRing = styled.circle<{ $active: boolean; $delay: number }>`
  fill: none;
  stroke: ${({ theme }) => theme.signal.live};
  stroke-width: 0.5;
  opacity: ${({ $active }) => ($active ? 0.5 : 0)};
  transition: opacity 0.4s ease;
  transform-origin: center;
  transform-box: fill-box;
  ${({ $active, $delay }) =>
    $active &&
    css`
      animation: ${haloPulse} 1.5s ease-in-out infinite;
      animation-delay: ${$delay}s;
    `}
`;

const HaloRingDelayed = styled(HaloRing)`
  ${({ $active }) =>
    $active &&
    css`
      animation: ${haloPulseDelayed} 1.5s ease-in-out infinite;
      animation-delay: 0.5s;
    `}
`;

const Connector = styled.line<{ $visible: boolean; $paused: boolean }>`
  stroke: ${({ theme }) => theme.ink[2]};
  stroke-width: 0.5;
  stroke-dasharray: 3 4;
  opacity: ${({ $visible }) => ($visible ? 0.7 : 0)};
  transition: opacity 0.3s ease;
  ${({ $visible, $paused }) =>
    $visible &&
    !$paused &&
    css`
      animation: ${dashFlow} 1.4s linear infinite;
    `}
`;

const MergeNodeGroup = styled.g<{ $visible: boolean }>`
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: opacity 0.35s ease;
`;

const PulseRing = styled.circle<{ $delay: number; $paused: boolean }>`
  fill: none;
  stroke: ${({ theme }) => theme.signal.live};
  stroke-width: 0.5;
  ${({ $paused, $delay }) =>
    !$paused &&
    css`
      animation: ${ringPulse} 2s ease-out infinite;
      animation-delay: ${$delay}s;
    `}
`;

const ChildGroup = styled.g<{ $visible: boolean }>`
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transform: ${({ $visible }) =>
    $visible
      ? `translate(${CENTER_X}px, ${CENTER_Y}px) scale(1)`
      : `translate(${CENTER_X}px, ${CENTER_Y}px) scale(0.5)`};
  transition:
    opacity 600ms ease-out,
    transform 800ms cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: ${CENTER_X}px ${CENTER_Y}px;
  transform-box: view-box;
`;

const ParentName = styled.text`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 11px;
  font-weight: 500;
  fill: ${({ theme }) => theme.ink[1]};
`;

const ParentEns = styled.text`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 9px;
  fill: ${({ theme }) => theme.ink[2]};
`;

const ChildName = styled.text`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 11px;
  font-weight: 500;
  fill: ${({ theme }) => theme.signal.live};
`;

const ChildEns = styled.text`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 9px;
  fill: ${({ theme }) => theme.ink[2]};
`;

const Glyph = styled.text`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 18px;
  fill: ${({ theme }) => theme.ink[1]};
  text-anchor: middle;
`;

const MergeLabel = styled.text<{ $visible: boolean }>`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 9px;
  fill: ${({ theme }) => theme.signal.live};
  letter-spacing: 0.12em;
  text-anchor: middle;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: opacity 0.4s ease;
`;

function makeParticlePool(): Particle[] {
  return Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
    active: false,
    fromLeft: true,
    startedAt: 0,
    duration: 1000,
    yJitter: 0,
  }));
}

export default function MergeStage({
  phase,
  paused,
  parent1Label,
  parent2Label,
  parent1DisplayName,
  parent2DisplayName,
  child,
  onParent1Click,
  onParent2Click,
}: Props) {
  const particlesRef = useRef<Particle[]>(makeParticlePool());
  const particleNodesRef = useRef<(SVGCircleElement | null)[]>([]);
  const lastSpawnRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  const mergeActive = isMergeActive(phase);
  const halosOn = showsHalos(phase);
  const connectorsOn = showsConnectors(phase);
  const childOn = showsChild(phase) && child !== null;
  const mergeNodeOn = phase === "merge";

  useEffect(() => {
    if (!mergeActive || paused) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    const tick = (now: number) => {
      const pool = particlesRef.current;
      if (now - lastSpawnRef.current >= SPAWN_INTERVAL_MS) {
        lastSpawnRef.current = now;
        const slot = pool.findIndex((p) => !p.active);
        if (slot !== -1) {
          pool[slot] = {
            active: true,
            fromLeft: Math.random() < 0.5,
            startedAt: now,
            duration: 900 + Math.random() * 400,
            yJitter: (Math.random() - 0.5) * 16,
          };
        }
      }

      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        const node = particleNodesRef.current[i];
        if (!node) continue;
        if (!p.active) {
          node.setAttribute("opacity", "0");
          continue;
        }
        const t = (now - p.startedAt) / p.duration;
        if (t >= 1) {
          p.active = false;
          node.setAttribute("opacity", "0");
          continue;
        }
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const startX = p.fromLeft ? LEFT_X + 32 : RIGHT_X - 32;
        const startY = CENTER_Y + p.yJitter;
        const endX = CENTER_X;
        const endY = CENTER_Y;
        const x = startX + (endX - startX) * ease;
        const arc = Math.sin(t * Math.PI) * (p.fromLeft ? -14 : 14);
        const y = startY + (endY - startY) * ease + arc;
        node.setAttribute("cx", String(x));
        node.setAttribute("cy", String(y));
        node.setAttribute("opacity", String(1 - t * 0.7));
        node.setAttribute("r", String(Math.max(0.4, 1.5 - t)));
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [mergeActive, paused]);

  useEffect(() => {
    if (mergeActive) return;
    const pool = particlesRef.current;
    for (let i = 0; i < pool.length; i++) {
      pool[i].active = false;
      const node = particleNodesRef.current[i];
      if (node) node.setAttribute("opacity", "0");
    }
  }, [mergeActive]);

  const parent1Display =
    parent1DisplayName ?? nameFromLabel(parent1Label);
  const parent2Display =
    parent2DisplayName ?? nameFromLabel(parent2Label);

  const particleSlots = useMemo(
    () => Array.from({ length: PARTICLE_POOL_SIZE }, (_, i) => i),
    [],
  );

  return (
    <StageWrap>
      <StageSvg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
        <Connector
          x1={LEFT_X + NODE_R}
          y1={CENTER_Y}
          x2={CENTER_X}
          y2={CENTER_Y}
          $visible={connectorsOn}
          $paused={paused}
        />
        <Connector
          x1={RIGHT_X - NODE_R}
          y1={CENTER_Y}
          x2={CENTER_X}
          y2={CENTER_Y}
          $visible={connectorsOn}
          $paused={paused}
        />

        <g>
          {particleSlots.map((i) => (
            <circle
              key={i}
              ref={(el) => {
                particleNodesRef.current[i] = el;
              }}
              cx={LEFT_X}
              cy={CENTER_Y}
              r="1.2"
              fill="#5DCAA5"
              opacity="0"
            />
          ))}
        </g>

        <ParentGroup
          className="left"
          $shifted={mergeActive}
          $clickable={Boolean(onParent1Click)}
          onClick={onParent1Click}
          tabIndex={onParent1Click ? 0 : undefined}
          role={onParent1Click ? "button" : undefined}
          aria-label={onParent1Click ? "select parent 1" : undefined}
        >
          <g transform={`translate(${LEFT_X}, ${CENTER_Y})`}>
            <circle
              r={44}
              fill="none"
              stroke="rgba(143, 164, 194, 0.5)"
              strokeWidth={0.4}
              strokeDasharray="2 4"
              opacity={0.5}
            />
            <HaloRing r={38} $active={halosOn} $delay={0} />
            <circle
              className="parent-core"
              r={NODE_R}
              fill="#0E1220"
              stroke={parent1Label ? "#E8ECF1" : "#5A6478"}
              strokeWidth={0.6}
              strokeDasharray={parent1Label ? undefined : "3 3"}
            />
            {parent1Label ? (
              <>
                <Glyph y={6}>{glyphForLabel(parent1Label)}</Glyph>
                <ParentName y={56} textAnchor="middle">
                  {parent1Display.toLowerCase()}
                </ParentName>
                <ParentEns y={69} textAnchor="middle">
                  {`${parent1Label}.mnemo.eth`}
                </ParentEns>
              </>
            ) : (
              <>
                <PlaceholderGlyph y={9}>+</PlaceholderGlyph>
                <PlaceholderName y={56} textAnchor="middle">
                  click to select
                </PlaceholderName>
              </>
            )}
            {onParent1Click && parent1Label && (
              <ParentHint className="parent-hint" y={82}>
                click to change
              </ParentHint>
            )}
          </g>
        </ParentGroup>

        <ParentGroup
          className="right"
          $shifted={mergeActive}
          $clickable={Boolean(onParent2Click)}
          onClick={onParent2Click}
          tabIndex={onParent2Click ? 0 : undefined}
          role={onParent2Click ? "button" : undefined}
          aria-label={onParent2Click ? "select parent 2" : undefined}
        >
          <g transform={`translate(${RIGHT_X}, ${CENTER_Y})`}>
            <circle
              r={44}
              fill="none"
              stroke="rgba(143, 164, 194, 0.5)"
              strokeWidth={0.4}
              strokeDasharray="2 4"
              opacity={0.5}
            />
            <HaloRingDelayed r={38} $active={halosOn} $delay={0.5} />
            <circle
              className="parent-core"
              r={NODE_R}
              fill="#0E1220"
              stroke={parent2Label ? "#E8ECF1" : "#5A6478"}
              strokeWidth={0.6}
              strokeDasharray={parent2Label ? undefined : "3 3"}
            />
            {parent2Label ? (
              <>
                <Glyph y={6}>{glyphForLabel(parent2Label)}</Glyph>
                <ParentName y={56} textAnchor="middle">
                  {parent2Display.toLowerCase()}
                </ParentName>
                <ParentEns y={69} textAnchor="middle">
                  {`${parent2Label}.mnemo.eth`}
                </ParentEns>
              </>
            ) : (
              <>
                <PlaceholderGlyph y={9}>+</PlaceholderGlyph>
                <PlaceholderName y={56} textAnchor="middle">
                  click to select
                </PlaceholderName>
              </>
            )}
            {onParent2Click && parent2Label && (
              <ParentHint className="parent-hint" y={82}>
                click to change
              </ParentHint>
            )}
          </g>
        </ParentGroup>

        <MergeNodeGroup $visible={mergeNodeOn}>
          <g transform={`translate(${CENTER_X}, ${CENTER_Y})`}>
            <PulseRing
              cx={0}
              cy={0}
              r={22}
              $delay={0}
              $paused={paused || !mergeNodeOn}
            />
            <PulseRing
              cx={0}
              cy={0}
              r={22}
              $delay={1}
              $paused={paused || !mergeNodeOn}
            />
            <circle r={22} fill="#E8ECF1" />
            <text
              y={6}
              fontFamily="ui-monospace, monospace"
              fontSize={18}
              fill="#07080C"
              textAnchor="middle"
            >
              ∞
            </text>
          </g>
        </MergeNodeGroup>

        <MergeLabel x={CENTER_X} y={CENTER_Y + 60} $visible={mergeNodeOn}>
          guided merge · glm-5
        </MergeLabel>

        {child && (
          <ChildGroup $visible={childOn}>
            <circle
              r={44}
              fill="none"
              stroke="rgba(93, 202, 165, 0.6)"
              strokeWidth={0.4}
              strokeDasharray="2 4"
            />
            <circle
              r={NODE_R}
              fill="#0E1220"
              stroke="#5DCAA5"
              strokeWidth={0.8}
            />
            <Glyph y={6}>{glyphForLabel(child.ensLabel)}</Glyph>
            <ChildName y={56} textAnchor="middle">
              {child.displayName.toLowerCase()}
            </ChildName>
            <ChildEns y={69} textAnchor="middle">
              {`${child.ensLabel}.mnemo.eth`}
            </ChildEns>
          </ChildGroup>
        )}
      </StageSvg>
    </StageWrap>
  );
}
