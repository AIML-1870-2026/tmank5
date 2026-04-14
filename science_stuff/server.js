require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const OpenAI  = require('openai');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ─── Label maps ────────────────────────────────────────────────────────────

const GRADE_LABELS = {
  'k-2':    'Kindergarten–2nd grade',
  '3-5':    '3rd–5th grade',
  '6-8':    '6th–8th grade',
  '9-12':   '9th–12th grade',
  'college':'College level',
};

const SAFETY_LABELS = {
  'home-safe':   'Home-safe (no hazardous materials)',
  'adult-super': 'Requires adult supervision',
  'lab-only':    'Lab environment only',
};

const TIME_LABELS = {
  'under-30': 'under 30 minutes',
  '30-60':    '30–60 minutes',
  '1-plus':   '1 hour or more',
};

const TEAM_LABELS = {
  'solo':        '1 student (solo)',
  'pairs':       '2 students (pairs)',
  'small-group': '3–5 students (small group)',
  'full-class':  'Full class (20–30 students)',
};

// Common household supplies for Surprise Me mode
const SURPRISE_SUPPLIES = [
  'baking soda, vinegar, dish soap, food coloring, a plastic bottle',
  'sugar, water, food coloring, a clear glass, a straw',
  'cornstarch, water, a bowl',
  'paper towels, water, a marker, a glass',
  'milk, vinegar, a pot, a strainer',
  'salt, ice, a zip-lock bag, water',
  'candle, matches, a glass jar, water',
  'pennies, vinegar, salt, paper towels',
  'balloons, wool sweater, small pieces of paper',
  'coffee filter, markers, water, a pencil',
];

const SURPRISE_GRADES   = ['k-2', '3-5', '3-5', '6-8', '6-8', '9-12'];
const SURPRISE_SUBJECTS = ['Biology', 'Chemistry', 'Chemistry', 'Physics', 'Earth Science', 'Environmental'];

// ─── Prompt builders ────────────────────────────────────────────────────────

function buildSuggestMessages({ gradeLevel, subject, safetyLevel, indoorOutdoor, teamSize }) {
  const gradeLabel  = GRADE_LABELS[gradeLevel]  || gradeLevel;
  const safetyLabel = SAFETY_LABELS[safetyLevel] || safetyLevel;
  const teamLabel   = TEAM_LABELS[teamSize]      || teamSize;

  return [
    {
      role: 'system',
      content: `You are a science curriculum expert. Generate a practical supply list for a ${gradeLabel} science experiment.
Subject: ${subject}
Safety level: ${safetyLabel}
Setting: ${indoorOutdoor}
Team size: ${teamLabel}
Return exactly 8–12 items as a plain comma-separated list (no bullets, no numbers, no markdown). Each item should be common and easy to find. No preamble, no explanation — just the list on a single line.`,
    },
    {
      role: 'user',
      content: 'Generate the supply list.',
    },
  ];
}

function buildExperimentMessages(params) {
  let { gradeLevel, subject, difficulty, timeRequired, safetyLevel,
        indoorOutdoor, teamSize, supplies, surpriseMe } = params;

  if (surpriseMe) {
    gradeLevel   = SURPRISE_GRADES[Math.floor(Math.random() * SURPRISE_GRADES.length)];
    subject      = SURPRISE_SUBJECTS[Math.floor(Math.random() * SURPRISE_SUBJECTS.length)];
    supplies     = SURPRISE_SUPPLIES[Math.floor(Math.random() * SURPRISE_SUPPLIES.length)];
    difficulty   = 'medium';
    timeRequired = '30-60';
    safetyLevel  = 'home-safe';
    indoorOutdoor = 'indoor';
    teamSize     = 'small-group';
  }

  const gradeLabel  = GRADE_LABELS[gradeLevel]   || gradeLevel;
  const safetyLabel = SAFETY_LABELS[safetyLevel]  || safetyLevel;
  const timeLabel   = TIME_LABELS[timeRequired]   || timeRequired;
  const teamLabel   = TEAM_LABELS[teamSize]        || teamSize;
  const supplyText  = supplies && supplies.trim()
    ? supplies.trim()
    : 'Use common household or classroom supplies appropriate for the grade level.';

  return [
    {
      role: 'system',
      content: `You are an experienced science teacher creating a complete, ready-to-use science experiment guide.
Grade level: ${gradeLabel}
Subject: ${subject}
Difficulty: ${difficulty}
Time required: ${timeLabel}
Safety level: ${safetyLabel}
Setting: ${indoorOutdoor}
Team size: ${teamLabel}
Available supplies: ${supplyText}

Write the experiment in the following markdown format. Use EXACTLY these section headers in this order — do not add or skip any:

## [Experiment Title]
**Learning Objective:** one sentence describing what students will learn or demonstrate
**NGSS Alignment:** one or two relevant standard tags (e.g. 5-PS1-4)
**Estimated Time:** X minutes
**Team Size:** X students

### Materials
Bullet list using only the provided supplies (water and paper/pencil may be added freely).

### Safety Notes
Brief safety notes appropriate for the grade and safety level. If home-safe, say so explicitly.

### Procedure
Numbered, step-by-step instructions written at the appropriate reading level for the grade.

### What to Expect
Describe what students will observe during and after the experiment.

### The Science Behind It
Explain the underlying concept at a depth appropriate for the grade level.

### Discussion Questions
3–5 questions that prompt reflection and deeper thinking.

### Extensions
2–3 variations or follow-up experiments to try next.

### Teacher / Parent Notes
Tips for facilitating, common pitfalls, and any preparation needed in advance.`,
    },
    {
      role: 'user',
      content: 'Generate the science experiment.',
    },
  ];
}

// ─── SSE helper ─────────────────────────────────────────────────────────────

function startSSE(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
}

function sendToken(res, token) {
  res.write(`data: ${JSON.stringify(token)}\n\n`);
}

function endSSE(res) {
  res.write('data: [DONE]\n\n');
  res.end();
}

function sendError(res, status, message) {
  res.status(status).json({ error: message });
}

// ─── Routes ─────────────────────────────────────────────────────────────────

app.post('/api/suggest-supplies', async (req, res) => {
  const { apiKey, model = 'gpt-4o', ...params } = req.body;

  if (!apiKey || !apiKey.trim()) {
    return sendError(res, 400, 'API key is required');
  }

  const openai = new OpenAI({ apiKey: apiKey.trim() });

  try {
    startSSE(res);

    const stream = await openai.chat.completions.create({
      model,
      messages: buildSuggestMessages(params),
      stream: true,
      max_tokens: 256,
      temperature: 0.7,
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) sendToken(res, token);
    }

    endSSE(res);
  } catch (err) {
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: interpretError(err) })}\n\n`);
      res.end();
    } else {
      const status = err?.status || err?.response?.status || 500;
      sendError(res, status, interpretError(err));
    }
  }
});

app.post('/api/generate-experiment', async (req, res) => {
  const { apiKey, model = 'gpt-4o', ...params } = req.body;

  if (!apiKey || !apiKey.trim()) {
    return sendError(res, 400, 'API key is required');
  }

  const openai = new OpenAI({ apiKey: apiKey.trim() });

  try {
    startSSE(res);

    const stream = await openai.chat.completions.create({
      model,
      messages: buildExperimentMessages(params),
      stream: true,
      max_tokens: 2048,
      temperature: 0.8,
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) sendToken(res, token);
    }

    endSSE(res);
  } catch (err) {
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: interpretError(err) })}\n\n`);
      res.end();
    } else {
      const status = err?.status || err?.response?.status || 500;
      sendError(res, status, interpretError(err));
    }
  }
});

// ─── Error interpreter ──────────────────────────────────────────────────────

function interpretError(err) {
  const msg    = (err?.message || '').toLowerCase();
  const status = err?.status || err?.response?.status;

  if (status === 401 || msg.includes('invalid api key') || msg.includes('incorrect api key')) {
    return 'Invalid API key — check your key and try again';
  }
  if (status === 429 || msg.includes('rate limit') || msg.includes('quota')) {
    return 'Rate limit reached — wait a moment and try again';
  }
  if (status === 400) {
    return 'Bad request — check your inputs';
  }
  if (msg.includes('timeout') || msg.includes('econnreset') || msg.includes('enotfound')) {
    return 'Network error — check your connection';
  }
  return err?.message || 'An unexpected error occurred';
}

// ─── Start ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Science Experiment Generator running at http://localhost:${PORT}`);
});
