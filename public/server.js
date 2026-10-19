// server.js
// A tiny backend with one job: take a role name from the frontend,
// ask Google's Gemini API to generate a practice task for it, and send the result back.
// The API key lives ONLY here on the server — it never reaches the browser.
// Gemini's free tier requires no credit card, which is why we're using it here.

require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/generate', async (req, res) => {
  const { role, difficulty } = req.body;
  const level = ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'easy';

  if (!role || typeof role !== 'string' || !role.trim()) {
    return res.status(400).json({ error: 'A role name is required.' });
  }

  if (!API_KEY) {
    return res.status(500).json({
      error: 'Server is missing GEMINI_API_KEY. Add it to your .env file.'
    });
  }

  const difficultyInstructions = {
    easy: `DIFFICULTY: EASY. Keep the dataset small and clean (8-10 rows, 4-5 columns, no messy/missing values). The task should be a single, clearly-defined ask. Provide 6-8 very granular, hand-holding steps. Hints can be fairly direct.`,
    medium: `DIFFICULTY: MEDIUM. Dataset should have 10-14 rows, 5-6 columns, with at least one minor data-quality issue (e.g. a few inconsistent labels or a missing value) the person has to notice and handle. The task should require 2 combined sub-tasks (e.g. clean the data AND build a summary). Provide 5-7 steps that are somewhat less granular — assume basic familiarity with the tool. Hints should be less direct, encouraging the person to think.`,
    hard: `DIFFICULTY: HARD. Dataset should have 14-20 rows, 6-8 columns, with multiple realistic messiness issues (inconsistent formatting, a few outliers, some missing values) that must be handled as part of the task. The task should be multi-part and closer to a real ambiguous work request (e.g. "figure out why X is happening and recommend an action"), requiring judgment calls. Provide only 3-5 higher-level steps (not granular click-by-click) — assume real familiarity with the tool, only giving strategic direction. Hints should be vague and thought-provoking, not procedural.`
  };

  const prompt = `You are creating a hands-on practice exercise for a student preparing for a "${role}" internship or entry-level job.

${difficultyInstructions[level]}

Return ONLY valid JSON (no markdown fences, no extra text) matching exactly this shape:

{
  "overview": "2-3 sentences on what someone in this role actually does day-to-day, in plain language.",
  "task": "One realistic task/problem statement this person would be given, using the sample data below. Should feel like a real assignment, not a quiz question. Match the complexity to the difficulty level above.",
  "steps": [
    "Exact, literal first action: name the specific app/tool to open (e.g. 'Open Power BI Desktop' or 'Open Google Sheets') and what to do first with this data.",
    "Continue with steps matching the count and granularity specified for this difficulty level above.",
    "Final step: what the finished result should look like so they know they're done."
  ],
  "columns": ["ColumnName1", "ColumnName2", "..."],
  "rows": [
    ["value1", "value2", "..."],
    ["value1", "value2", "..."]
  ],
  "hints": [
    "First hint - a gentle nudge on where to start, no direct answer.",
    "Second hint - a more specific step.",
    "Third hint - close to a walkthrough, for someone totally stuck."
  ]
}

Rules for the data: invent a small, realistic, FAKE dataset appropriate to this role's actual work, sized and quality-level as specified in the difficulty instructions above. For a Data Analyst -> sales/metrics data. For HR -> employee/candidate data. For Marketing -> campaign performance data. For a developer role -> bug reports or API logs. Adapt sensibly to whatever role is given, including non-technical roles. Keep values realistic-looking but entirely made up.

Rules for steps: name real, specific software (Power BI, Excel, Google Analytics, VS Code, Jira, Canva, etc. - whatever fits the role) and literal actions (menu names, button labels) when the difficulty calls for granular steps. Match step count and granularity to the difficulty level. This is different from hints - hints nudge toward thinking, steps tell them what to do (with the level of detail set by difficulty).

Provide exactly 3 hints, ordered from vague to specific, with directness matching the difficulty level.`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', errText);
      return res.status(502).json({ error: 'Failed to reach Gemini API.' });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    res.json(parsed);
  } catch (err) {
    console.error('Error generating task:', err);
    res.status(500).json({ error: 'Something went wrong generating the task.' });
  }
});

app.listen(PORT, () => {
  console.log(`Role Prep app running at http://localhost:${PORT}`);
});
