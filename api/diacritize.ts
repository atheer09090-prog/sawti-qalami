import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: "missing text" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        system:
          "أنت مساعد متخصص في اللغة العربية. مهمتك الوحيدة هي إضافة التشكيل الكامل وعلامات الترقيم المناسبة للنص العربي المُدخل. أعد النص كاملاً مع التشكيل فقط، بدون أي شرح أو إضافات.",
        messages: [
          {
            role: "user",
            content: `أضف التشكيل الكامل وعلامات الترقيم لهذا النص:\n${text}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: err });
    }

    const data = await response.json();
    const result = data?.content?.[0]?.text?.trim() || text;
    return res.status(200).json({ result });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
