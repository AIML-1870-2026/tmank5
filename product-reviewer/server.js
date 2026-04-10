const express = require("express");
const OpenAI = require("openai");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function getClient(apiKey) {
  return new OpenAI({ apiKey });
}

const EDUCATION_LABELS = {
  1: { label: "barely literate", instruction: "short sentences, simple vocabulary, may misspell common words" },
  2: { label: "below average", instruction: "casual, occasional grammatical errors" },
  3: { label: "average", instruction: "everyday vocabulary, natural flow" },
  4: { label: "above average", instruction: "varied vocabulary, well-structured paragraphs" },
  5: { label: "PhD-level", instruction: "sophisticated vocabulary, complex sentence structure, may reference technical specs" },
};

const AUTHENTICITY_INSTRUCTIONS = {
  1: "Write in polished, correct prose",
  2: "Mostly clean, minor informal phrasing",
  3: "Natural voice — occasional contractions, casual punctuation",
  4: "Informal — some typos, run-on sentences, missing commas",
  5: "Chaotic — deliberate typos, no caps, stream-of-consciousness, emoji ok",
};

const LENGTH_WORDS = { short: 50, medium: 150, long: 350 };

// education slider 1→5 maps to temperature 0.9→0.5
function educationToTemperature(education) {
  return 0.9 - ((education - 1) / 4) * 0.4;
}

app.post("/api/generate", async (req, res) => {
  const { product, details, stars, platform, temperament, persona, education, authenticity, length, model, apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: "API key is required" });
  }

  const edu = EDUCATION_LABELS[education] || EDUCATION_LABELS[3];
  const authInstruction = AUTHENTICITY_INSTRUCTIONS[authenticity] || AUTHENTICITY_INSTRUCTIONS[3];
  const lengthWords = LENGTH_WORDS[length] || 150;
  const temperature = educationToTemperature(Number(education));

  const personaText = persona === "None" ? "a regular person" : `a ${persona}`;

  const systemPrompt = `You are ${personaText} writing a ${platform}-style product review.
Tone: ${temperament}.
Education level: ${edu.label} — ${edu.instruction}.
Authenticity: ${authInstruction}.
Length: approximately ${lengthWords} words.
Rating: ${stars} out of 5 stars.
Write ONLY the review text. No preamble, no quotation marks around the whole review.`;

  const userPrompt = `Product: ${product}\nDetails to work in: ${details || "None provided"}`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const stream = await getClient(apiKey).chat.completions.create({
      model: model || "gpt-4o",
      stream: true,
      temperature,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) {
        res.write(`data: ${JSON.stringify(token)}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error("OpenAI error:", err.message);
    res.write(`data: [ERROR] ${err.message}\n\n`);
    res.end();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Product Reviewer running at http://localhost:${PORT}`));
