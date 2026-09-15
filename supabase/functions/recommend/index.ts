// "Recommend with AI": Groq picks 3 majors and writes why, for a signed-in student.
//
// The AI never invents a major. The page sends the top candidates recRank() in
// recommend.js already chose, and the JSON schema below only allows those keys,
// so the AI reorders and explains the engine's list; it cannot add to it.
//
// The Groq key is a secret and lives only here:
//   supabase secrets set GROQ_API_KEY=gsk_...
//   supabase functions deploy recommend
// Supabase checks the student's JWT before this code runs (verify_jwt default).
//
// ponytail: no per-student rate limit; Groq's own account limits cap abuse.
// Add a counter table if the key moves off the free tier.

const MODEL = "openai/gpt-oss-120b";
const LANGS: Record<string, string> = {
  uz: "Uzbek, Latin script",
  ru: "Russian",
  en: "English",
};
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
const clip = (v: unknown, max: number) => String(v ?? "").slice(0, max);

// The README's rules, restated for the model: they are why the tool can be
// handed to a fifteen-year-old, and an LLM will break every one unless told.
const system = (lang: string) =>
  `You help a school student in Uzbekistan, aged 13-18, choose a university major.
From the candidate list ONLY, choose the 3 majors that fit the student's profile best, strongest first.
For each, write 1-2 short, warm sentences in ${lang} that name the concrete signals from the profile behind the fit.
Rules:
- Never mention salaries, job demand, employment chances, percentages or scores.
- Never say a major is guaranteed, or that the student cannot do something.
- Never show letter codes such as "SIA" or trait abbreviations.
- Address the student directly and politely (siz / вы / you).`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return reply({ error: "method" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return reply({ error: "bad-json" }, 400);
  }

  const lang = LANGS[body?.lang] ? body.lang : "uz";
  const candidates = (Array.isArray(body?.candidates) ? body.candidates : [])
    .slice(0, 10)
    .map((c: any) => ({ key: clip(c?.key, 80), name: clip(c?.name, 120) }))
    .filter((c: { key: string }) => c.key);
  const keys = [...new Set(candidates.map((c: { key: string }) => c.key))];
  if (keys.length < 3) return reply({ error: "few-candidates" }, 400);
  const profile = JSON.stringify(body?.profile ?? {}).slice(0, 2000);

  const groq = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.4,
      reasoning_effort: "low",
      max_completion_tokens: 2000,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "majors",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["picks"],
            properties: {
              picks: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["key", "why"],
                  properties: {
                    key: { type: "string", enum: keys },
                    why: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
      messages: [
        { role: "system", content: system(LANGS[lang]) },
        {
          role: "user",
          content: `Student profile: ${profile}\nCandidate majors: ${JSON.stringify(candidates)}`,
        },
      ],
    }),
  });
  if (!groq.ok) return reply({ error: "groq", status: groq.status }, 502);

  // Schema or not, check it again: a bad answer must fall back, not render.
  try {
    const data = await groq.json();
    const seen = new Set<string>();
    const picks = JSON.parse(data.choices[0].message.content).picks
      .filter((p: any) => keys.includes(p?.key) && !seen.has(p.key) && seen.add(p.key))
      .slice(0, 3)
      .map((p: any) => ({ key: p.key, why: clip(p.why, 400) }));
    if (picks.length < 3) throw new Error("fewer than 3 picks");
    return reply({ picks });
  } catch {
    return reply({ error: "bad-answer" }, 502);
  }
});
