import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const BASE_SYSTEM_PROMPT = `You are an expert web developer. Generate a complete, self-contained single-file HTML application.

Requirements:
- Return ONLY raw HTML code — no markdown, no code fences, no explanations
- All CSS and JavaScript must be inline (no external files)
- Use a modern, clean visual design with a pleasant color palette
- Make it fully interactive and functional
- Use vanilla JS; CDN libraries are allowed when truly necessary
- Must work immediately when opened in a browser
- Add animations and visual polish where appropriate
- Make sure the app is complete and production-ready`;

interface ApiMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  const { messages, currentCode } = (await request.json()) as {
    messages: ApiMessage[];
    currentCode?: string;
  };

  if (!messages?.length) {
    return Response.json({ error: "メッセージを入力してください" }, { status: 400 });
  }

  const systemPrompt = currentCode
    ? `${BASE_SYSTEM_PROMPT}

You are refining an existing app. Here is the current HTML code:
\`\`\`html
${currentCode}
\`\`\`

Apply the user's requested changes and return the complete updated HTML. Preserve everything that wasn't asked to change.`
    : BASE_SYSTEM_PROMPT;

  // Replace assistant messages (which may contain raw HTML) with short placeholders
  // so the model understands the conversation flow without being overwhelmed by HTML
  const apiMessages: ApiMessage[] = messages.map((msg) =>
    msg.role === "assistant"
      ? { role: "assistant", content: "HTML application generated as requested." }
      : msg
  );

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: systemPrompt,
    messages: apiMessages,
  });

  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
