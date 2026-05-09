import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function classify(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });
  const block = msg.content[0];
  if (block.type !== "text") throw new Error("Unexpected LLM response type");
  return block.text;
}
