import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function classify(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const msg = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });
  const text = msg.choices[0]?.message?.content;
  if (!text) throw new Error("Empty LLM response");
  return text;
}
