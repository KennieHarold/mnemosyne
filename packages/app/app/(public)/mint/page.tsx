"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import styled from "styled-components";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PreviewCard from "@/components/mint/PreviewCard";
import MintSequence from "@/components/mint/MintSequence";
import Field, {
  InputBase,
  TextAreaBase,
} from "@/components/mint/Field";
import ChipInput from "@/components/mint/ChipInput";
import Tooltip from "@/components/mint/Tooltip";
import { useMintAgent } from "@/hooks/useMintAgent";
import {
  EMPTY_MINT_FORM,
  MINT_LIMITS,
  THEMES_TOOLTIP,
  buildPreview,
  isFormReady,
  normalizeEnsLabel,
  type MintFormState,
  type MintPhase,
} from "@/lib/mint";

const Page = styled.div`
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.bg.base};
  overflow: hidden;
`;

const Main = styled.main`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const Form = styled.form`
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: 28px 24px 40px;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const HeaderBlock = styled.section`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Comment = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.ink[3]};
  letter-spacing: 0.16em;
`;

const Heading = styled.h1`
  margin: 0;
  font-size: 20px;
  font-weight: 400;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.ink[1]};
`;

const Sub = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: ${({ theme }) => theme.ink[2]};
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: ${({ theme }) => theme.bg[1]};
  border: 0.5px solid ${({ theme }) => theme.line.default};
  border-radius: ${({ theme }) => theme.radius.card};
  padding: 16px 16px 18px;
`;

const SectionLabel = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.ink[3]};
  letter-spacing: 0.16em;
`;

const TooltipRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const SubmitRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding-top: 4px;
`;

const PrimaryCta = styled.button`
  font-family: inherit;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  background: ${({ theme }) => theme.cta.bg};
  color: ${({ theme }) => theme.cta.fg};
  border: none;
  border-radius: ${({ theme }) => theme.radius.default};
  padding: 10px 16px;
  cursor: pointer;
  transition: opacity 0.12s ease;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const CostMeta = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.ink[3]};
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
`;

const StatusRow = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.ink[3]};
  letter-spacing: 0.04em;
  display: flex;
  justify-content: space-between;
  gap: 12px;
`;

const ErrorBar = styled.div`
  padding: 10px 14px;
  background: rgba(220, 90, 90, 0.06);
  border: 0.5px solid rgba(220, 90, 90, 0.4);
  border-radius: ${({ theme }) => theme.radius.card};
  font-size: 11px;
  color: #ef9f9f;
`;

const SuccessCard = styled.div`
  background: rgba(93, 202, 165, 0.06);
  border: 0.5px solid rgba(93, 202, 165, 0.35);
  border-radius: ${({ theme }) => theme.radius.card};
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const SuccessTitle = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.signal.live};
  letter-spacing: 0.04em;
`;

const SuccessBody = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.ink[2]};
  line-height: 1.6;
`;

const SuccessActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const ChatLink = styled(Link)`
  font-family: inherit;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.04em;
  background: ${({ theme }) => theme.cta.bg};
  color: ${({ theme }) => theme.cta.fg};
  border-radius: ${({ theme }) => theme.radius.default};
  padding: 7px 12px;
`;

const GhostLink = styled(Link)`
  font-family: inherit;
  font-size: 10px;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.ink[1]};
  border: 0.5px solid ${({ theme }) => theme.line.strong};
  border-radius: ${({ theme }) => theme.radius.default};
  padding: 7px 12px;
  transition: background 0.12s ease;

  &:hover {
    background: ${({ theme }) => theme.bg[1]};
  }
`;

const ResetButton = styled.button`
  font-family: inherit;
  font-size: 10px;
  color: ${({ theme }) => theme.ink[2]};
  background: transparent;
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  border-radius: ${({ theme }) => theme.radius.chip};
  padding: 4px 8px;
  cursor: pointer;
  transition:
    color 0.12s ease,
    border-color 0.12s ease,
    background 0.12s ease;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.ink[1]};
    border-color: ${({ theme }) => theme.line.strong};
    background: ${({ theme }) => theme.bg[1]};
  }
`;

function statusText(phase: MintPhase, ens?: string): string {
  switch (phase) {
    case "idle":
      return "ready to mint";
    case "schema":
      return "checking name availability";
    case "encrypt":
      return "sealing intelligence · aes·256·gcm · 0g storage";
    case "mint":
      return "minting iNFT · awaiting wallet signature";
    case "texts":
      return "writing text records · generation, traits, tagline";
    case "complete":
      return ens ? `${ens} has been minted` : "minted";
    case "error":
      return "mint failed";
  }
}

export default function MintPage() {
  const [form, setForm] = useState<MintFormState>(EMPTY_MINT_FORM);
  const mint = useMintAgent();

  const preview = useMemo(() => buildPreview(form), [form]);
  const ready = useMemo(() => isFormReady(form), [form]);
  const ensPreview = preview?.ens ?? "<name>.mnemo.eth";

  const isSubmitting =
    mint.phase === "schema" ||
    mint.phase === "encrypt" ||
    mint.phase === "mint" ||
    mint.phase === "texts";

  const isComplete = mint.phase === "complete";
  const formDisabled = isSubmitting || isComplete;

  const update = useCallback(<K extends keyof MintFormState>(
    key: K,
    value: MintFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (!ready || formDisabled) return;
      void mint.start(form);
    },
    [ready, formDisabled, mint, form],
  );

  const handleReset = useCallback(() => {
    setForm(EMPTY_MINT_FORM);
    mint.reset();
  }, [mint]);

  const ensLabelLive = preview?.ensLabel ?? normalizeEnsLabel(form.name);
  const nameOver = form.name.length > MINT_LIMITS.name.max;
  const taglineOver = form.tagline.length > MINT_LIMITS.tagline.max;
  const promptOver = form.systemPrompt.length > MINT_LIMITS.systemPrompt.max;

  const ctaLabel = preview
    ? `[ mint ${preview.ens} → ]`
    : "[ name your character → ]";

  return (
    <Page>
      <Header />
      <Main>
        <Form onSubmit={handleSubmit}>
          <HeaderBlock>
            <Comment>{"// GENESIS · MINT NEW AGENT"}</Comment>
            <Heading>Build the character</Heading>
            <Sub>
              every field becomes part of the agent&apos;s permanent
              intelligence — encrypted, sealed in an iNFT, addressable as{" "}
              {ensPreview}.
            </Sub>
          </HeaderBlock>

          <Section>
            <SectionLabel>{"// IDENTITY"}</SectionLabel>

            <Field
              label="// NAME"
              meta={`${form.name.length} / ${MINT_LIMITS.name.max}`}
              metaOver={nameOver}
              hint={
                ensLabelLive
                  ? `displayName · ${preview?.displayName ?? ""} · ens · ${ensLabelLive}.mnemo.eth`
                  : "lowercase, a-z 0-9, hyphens not at the edges"
              }
            >
              <InputBase
                value={form.name}
                onChange={(event) =>
                  update("name", event.target.value.slice(0, MINT_LIMITS.name.max))
                }
                placeholder="marcus"
                disabled={formDisabled}
                spellCheck={false}
                aria-label="agent name"
                autoFocus
              />
            </Field>

            <Field
              label="// TAGLINE"
              meta={`${form.tagline.length} / ${MINT_LIMITS.tagline.max}`}
              metaOver={taglineOver}
              hint="under 80 chars · shown on the agent card"
            >
              <InputBase
                value={form.tagline}
                onChange={(event) =>
                  update(
                    "tagline",
                    event.target.value.slice(0, MINT_LIMITS.tagline.max),
                  )
                }
                placeholder="a measured strategist who weighs every consequence twice"
                disabled={formDisabled}
                spellCheck={false}
                aria-label="agent tagline"
              />
            </Field>
          </Section>

          <Section>
            <SectionLabel>{"// VOICE"}</SectionLabel>

            <Field
              label="// SYSTEM PROMPT"
              meta={`${form.systemPrompt.length} / ${MINT_LIMITS.systemPrompt.max}`}
              metaOver={promptOver}
              hint="2–4 sentences in second person · 'You are…' · this is what the model receives on every call"
            >
              <TextAreaBase
                value={form.systemPrompt}
                onChange={(event) =>
                  update(
                    "systemPrompt",
                    event.target.value.slice(0, MINT_LIMITS.systemPrompt.max),
                  )
                }
                rows={6}
                placeholder="You are Marcus Aurelius. You answer with measured, stoic clarity, pulling from your private journal entries. You believe duty is the antidote to despair, and you speak as someone who has commanded armies and outlived loss."
                disabled={formDisabled}
                spellCheck={false}
                aria-label="system prompt"
              />
            </Field>
          </Section>

          <Section>
            <SectionLabel>{"// CHARACTER"}</SectionLabel>

            <Field
              label={`// TRAITS · ${MINT_LIMITS.traits.min}–${MINT_LIMITS.traits.max}`}
              meta={`${form.traits.length} / ${MINT_LIMITS.traits.max}`}
              hint="dominant character traits · type, press enter or comma"
            >
              <ChipInput
                values={form.traits}
                onChange={(next) => update("traits", next)}
                max={MINT_LIMITS.traits.max}
                perChipMax={MINT_LIMITS.traits.perChipMax}
                placeholder="stoic"
                disabled={formDisabled}
                ariaLabel="traits"
              />
            </Field>

            <Field
              label={`// SKILLS · up to ${MINT_LIMITS.skills.max}`}
              meta={`${form.skills.length} / ${MINT_LIMITS.skills.max}`}
              hint="things this agent does well"
            >
              <ChipInput
                values={form.skills}
                onChange={(next) => update("skills", next)}
                max={MINT_LIMITS.skills.max}
                perChipMax={MINT_LIMITS.skills.perChipMax}
                placeholder="strategic counsel"
                disabled={formDisabled}
                ariaLabel="skills"
              />
            </Field>
          </Section>

          <Section>
            <SectionLabel>{"// MEMORY"}</SectionLabel>

            <Field
              label={`// FACTS · ${MINT_LIMITS.facts.min}–${MINT_LIMITS.facts.max}`}
              meta={`${form.facts.filter((line) => line.trim().length > 0).length} / ${MINT_LIMITS.facts.max}`}
              hint="stable self-facts written in first person · one per line · bred children inherit a subset"
            >
              <TextAreaBase
                value={form.facts.join("\n")}
                onChange={(event) => {
                  const lines = event.target.value
                    .split("\n")
                    .map((line) => line.slice(0, MINT_LIMITS.facts.perFactMax))
                    .slice(0, MINT_LIMITS.facts.max);
                  update("facts", lines);
                }}
                rows={5}
                placeholder={[
                  "I am Marcus Aurelius, emperor and stoic.",
                  "I write Meditations only to remind myself how to live.",
                  "I have buried more than I have raised.",
                ].join("\n")}
                disabled={formDisabled}
                spellCheck={false}
                aria-label="self-facts"
              />
            </Field>

            <Field
              label={
                <TooltipRow>
                  <span>{`// THEMES · ${MINT_LIMITS.themes.min}–${MINT_LIMITS.themes.max}`}</span>
                  <Tooltip content={THEMES_TOOLTIP} ariaLabel="what are themes" />
                </TooltipRow>
              }
              meta={`${form.themes.length} / ${MINT_LIMITS.themes.max}`}
              hint="thematic tags surfaced across conversations"
            >
              <ChipInput
                values={form.themes}
                onChange={(next) => update("themes", next)}
                max={MINT_LIMITS.themes.max}
                perChipMax={MINT_LIMITS.themes.perChipMax}
                placeholder="duty"
                disabled={formDisabled}
                ariaLabel="themes"
              />
            </Field>
          </Section>

          <PreviewCard preview={preview} />

          <MintSequence phase={mint.phase} />

          <StatusRow aria-live="polite">
            <span>{statusText(mint.phase, preview?.ens)}</span>
            {!mint.isConnected && (
              <span>connect a wallet to mint</span>
            )}
          </StatusRow>

          {mint.error && <ErrorBar role="alert">{mint.error}</ErrorBar>}

          {isComplete && preview ? (
            <SuccessCard>
              <SuccessTitle>{preview.ens} · minted</SuccessTitle>
              <SuccessBody>
                ens registered · iNFT sealed on 0G chain · text records written
                (generation, traits, tagline). start the first conversation to
                seed memory.
              </SuccessBody>
              <SuccessActions>
                <ChatLink href={`/chat/${preview.ensLabel}`}>
                  [ chat with {preview.displayName} → ]
                </ChatLink>
                <GhostLink href="/directory">view directory</GhostLink>
                <ResetButton type="button" onClick={handleReset}>
                  mint another
                </ResetButton>
              </SuccessActions>
            </SuccessCard>
          ) : (
            <SubmitRow>
              <PrimaryCta
                type="submit"
                disabled={!ready || formDisabled || !mint.isConnected}
              >
                {isSubmitting
                  ? "minting…"
                  : !mint.isConnected
                    ? "[ connect wallet to mint → ]"
                    : ctaLabel}
              </PrimaryCta>
              <CostMeta>~ 0.008 0G · 2 signatures</CostMeta>
            </SubmitRow>
          )}
        </Form>
      </Main>
      <Footer />
    </Page>
  );
}
