# Role Prep

Practise the real work before your internship starts.

**Live demo:** https://role-prep-app.onrender.com
(Free hosting: if the site has been idle, the first load can take around a minute.)

Type any internship or job role and Role Prep builds a hands-on practice session for it: a plain-language role overview, a realistic task, a fake dataset to work on, an exact step-by-step walkthrough, and hints. Finish tasks to earn points, build a daily streak and level up.

## Problem

Students can find internships, but have no way to practise the actual work, with realistic data and clear guidance, before they start. Job sites only list openings, interview prep covers questions rather than tasks, and beginners often do not know which tool to open or what to click.

## Version history

- **v2.0** - Old Chinese dusk theme across the whole app (deep red and gold, pagoda silhouettes, lanterns), a welcome screen with a pagoda scene and swaying lanterns, and matching gold and red dashboard styling.
- **v1.0** - Role-based practice tasks with fake datasets, step-by-step walkthrough, hints, Easy/Medium/Hard levels, and a points and streak dashboard.

The code of every version stays available under **Releases** (use the tag dropdown to browse the files as they were in v1.0).

## Features

- **Any role, any field:** data, HR, marketing, development and more. No fixed question bank.
- **Difficulty levels:** Easy (clean data, detailed steps), Medium (small data issues, fewer steps), Hard (messy data, high-level steps, vague hints).
- **Beginner mode:** a click-by-click walkthrough with a checklist and progress bar. Switch it off to try the task on your own first.
- **Hints:** three hints per task, from a gentle nudge to near-solution.
- **Dashboard:** total points, level (Rookie, Intern, Pro, Expert), current and best streak, last 14 days of activity, completed tasks by difficulty and recent practice.
- **Welcome screen (v2.0):** a dusk scene over an old Chinese town that greets the learner before the app opens.

### Scoring

| Difficulty | Points for completing all steps |
|------------|---------------------------------|
| Easy       | 10                              |
| Medium     | 20                              |
| Hard       | 30                              |

Finish without opening any hint and you get a **+5 bonus**. A streak counts each day you complete at least one task.

## Tech stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js and Express
- AI: Google Gemini API (called from the server, so the key is never exposed to the browser)
- Hosting: Render
- Built as a learning project with help from Claude (an AI assistant by Anthropic).

## Project structure

```
role-prep-app/
├── server.js         backend: receives a role, calls the Gemini API, returns structured JSON
├── package.json      dependencies (express, dotenv)
├── .env.example      template for your API key
├── .gitignore        keeps .env and node_modules out of Git
└── public/
    ├── index.html    page structure and welcome screen
    ├── style.css     styling and the Chinese dusk theme
    ├── script.js     practice flow: generate task, walkthrough, hints
    └── dashboard.js  points, streaks and the Dashboard tab
```

## Setup

1. Install [Node.js](https://nodejs.org) (LTS version).
2. Install dependencies:
   ```
   npm install
   ```
3. Get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).
4. Copy `.env.example` to a new file named `.env` and paste your key:
   ```
   GEMINI_API_KEY=your-key-here
   ```
   Never commit `.env`. It is listed in `.gitignore`.
5. Start the app:
   ```
   npm start
   ```
6. Open http://localhost:3000

## How it works

1. You type a role, choose a difficulty and click Generate.
2. The browser sends the role and difficulty to `server.js`.
3. The server asks Gemini for a JSON response containing the overview, task, steps, dataset and hints, then returns it.
4. The page renders the result. Your progress and points are saved in your browser (localStorage).

## Notes

- Stats are stored per browser, so clearing browser data resets them.
- The free Gemini tier can occasionally return a "high demand" (503) error. Try again after a short wait.

## Future scope

- AI feedback on the learner's submitted answer
- Accounts and a database, so history and a leaderboard work across devices
- Automatic retry when the AI service is busy
- Role categories (Tech, Marketing, HR, Finance)
