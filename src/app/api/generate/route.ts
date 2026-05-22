import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are an expert web developer. Generate a complete, self-contained single-file HTML application based on the user's description.

Requirements:
- Return ONLY the raw HTML code, no markdown, no code blocks, no explanation
- The HTML must be fully self-contained (all CSS and JS inline)
- Use modern, clean design with a pleasant color palette
- Make it interactive and functional
- Include error handling where appropriate
- Use vanilla JS (no external libraries unless via CDN)
- The app must work immediately when opened in a browser
- Make it visually impressive with animations where appropriate`;

export async function POST(request: Request) {
  const { description } = await request.json();

  if (!description || description.trim().length === 0) {
    return Response.json({ error: "説明を入力してください" }, { status: 400 });
  }

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Create a web app: ${description}`,
      },
    ],
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
      } catch (error) {
        controller.error(error);
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
