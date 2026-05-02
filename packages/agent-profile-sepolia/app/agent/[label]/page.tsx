import { notFound } from "next/navigation";
import { fetchAgentRecords } from "../../../lib/ens";
import { isValidLabel, normalizeLabel } from "../../../lib/label";
import AgentProfile from "./profile";

export const revalidate = 30;

export default async function Page({
  params,
}: {
  params: Promise<{ label: string }>;
}) {
  const { label: raw } = await params;
  const label = normalizeLabel(decodeURIComponent(raw));
  if (!isValidLabel(label)) notFound();

  const records = await fetchAgentRecords(label);
  return <AgentProfile label={label} records={records} />;
}
