import { NextResponse, type NextRequest } from "next/server";
import { breedIntelligenceStream } from "@/lib/server/breed";
import type { BreedEvent } from "@/lib/breed-events";

type BreedRequestBody = {
  parent1Label?: unknown;
  parent2Label?: unknown;
};

export async function POST(request: NextRequest) {
  let body: BreedRequestBody;
  try {
    body = (await request.json()) as BreedRequestBody;
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }

  const parent1Label =
    typeof body.parent1Label === "string" ? body.parent1Label.trim() : "";
  const parent2Label =
    typeof body.parent2Label === "string" ? body.parent2Label.trim() : "";

  if (!parent1Label || !parent2Label) {
    return NextResponse.json(
      { error: "parent1Label and parent2Label are required" },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: BreedEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        for await (const event of breedIntelligenceStream({
          parent1Label,
          parent2Label,
        })) {
          send(event);
          if (event.type === "error") break;
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        send({ type: "error", message: reason });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
    },
  });
}
