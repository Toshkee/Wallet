export const config = {
  api: { bodyParser: { sizeLimit: "4mb" } }
};

function isSameOriginRequest(req) {
  const origin = req.headers.origin;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  try {
    return Boolean(origin && host && new URL(origin).host === host);
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!isSameOriginRequest(req)) return res.status(403).json({ error: "Invalid request origin" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "Gemini API key is not configured" });

  const audio = String(req.body?.audio || "");
  const mimeType = String(req.body?.mimeType || "audio/webm").split(";")[0];
  if (!audio || !mimeType.startsWith("audio/")) return res.status(400).json({ error: "Valid audio is required" });
  if (audio.length > 3600000) return res.status(413).json({ error: "Audio recording is too large" });

  const model = process.env.GEMINI_VOICE_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const prompt = "Prepiši samo izgovorene riječi iz ovog kratkog audio zapisa. Jezik je najvjerovatnije crnogorski/srpski. Ne dodaj objašnjenja, navodnike ni komentare.";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType, data: audio } }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 160 }
      })
    });
    const result = await response.json();
    if (!response.ok) return res.status(502).json({ error: result?.error?.message || "Gemini voice request failed" });
    const transcript = result?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!transcript) return res.status(502).json({ error: "No speech was recognised" });
    return res.status(200).json({ transcript });
  } catch (error) {
    return res.status(502).json({ error: "Unable to reach Gemini voice service" });
  }
}
