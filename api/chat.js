export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "Gemini API key is not configured" });
  const body = req.body || {};
  const question = String(body.question || "").trim();
  if (!question) return res.status(400).json({ error: "Question is required" });
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const system = [
    "Ti si Vibe Wallet, kratak i praktičan finansijski asistent za korisnika iz Crne Gore.",
    "Odgovaraj na srpskom/crnogorskom jeziku, prijateljski i jasno.",
    "Koristi samo podatke koje dobiješ. Ne izmišljaj transakcije niti finansijske činjenice.",
    "Kada računaš uštedu, jasno napiši mjesečni iznos i, ako je korisno, godišnji iznos.",
    "Ne daj investicione, poreske ili kreditne savjete. Predloži jednu ili dvije konkretne akcije.",
    "Odgovor neka bude kratak (najviše 4 rečenice), bez markdown tabele."
  ].join(" ");
  const context = JSON.stringify({ month: body.month || null, summary: body.summary || null, budgets: body.budgets || {}, goal: body.goal || null, transactions: Array.isArray(body.transactions) ? body.transactions.slice(0, 200) : [] });
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: `Pitanje korisnika: ${question}\n\nPodaci iz Walleta (JSON): ${context}` }] }], generationConfig: { temperature: 0.35, maxOutputTokens: 220 } })
    });
    const result = await response.json();
    if (!response.ok) return res.status(502).json({ error: result?.error?.message || "Gemini request failed" });
    const answer = result?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!answer) return res.status(502).json({ error: "Gemini returned an empty answer" });
    return res.status(200).json({ answer });
  } catch (error) {
    return res.status(502).json({ error: "Unable to reach Gemini" });
  }
}
