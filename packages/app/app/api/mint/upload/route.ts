import { NextResponse, type NextRequest } from "next/server";
import {
  validateMintForm,
  type MintFormState,
} from "@/lib/mint";
import { prepareGenesisMint } from "@/server/mint";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }

  const form = body as MintFormState;
  const validation = validateMintForm(form);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const { encryptedURI, metadataHash, schema } = await prepareGenesisMint(
      validation.schema,
    );
    return NextResponse.json({ encryptedURI, metadataHash, schema });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
