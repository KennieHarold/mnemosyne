import { NextResponse, type NextRequest } from "next/server";
import { runInference } from "@/server/inference";

type ChatRequestBody = {
  message?: unknown;
};

type StreamEvent =
  | { type: "status"; message: string }
  | { type: "delta"; content: string }
  | { type: "done" }
  | { type: "error"; message: string };

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ label: string }> },
) {
  const { label } = await params;

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json(
      { error: "message must be a non-empty string" },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        await runInference({
          label,
          userMessage: message,
          onStatus: (status) => send({ type: "status", message: status }),
          onDelta: (content) => send({ type: "delta", content }),
          signal: request.signal,
        });
        send({ type: "done" });
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
