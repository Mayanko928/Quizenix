The attached spec describes ~12 modules plus gamification, analytics, auth, and file uploads. That's several days of focused work and needs a backend (Lovable Cloud) for XP, streaks, weak-topic tracking, planner, and progress. I'll ship it in phases so each step is usable, then you confirm before we go deeper.

## Phase 1 — Rebrand + richer generation (no backend)
- Rename app to **Quizenix** everywhere (titles, meta, headings, hero copy: "AI Study Coach").
- Landing page polish: animated hero, drag‑and‑drop file upload (PDF/DOCX/PPTX/TXT → parsed client/server side), feature cards, FAQ, footer, pricing placeholder.
- Multi‑stage loading animation: Reading → Concept graph → Flashcards → Quiz → Finalizing.
- Extend AI generation to also return: concept map, summary, hints, memory tricks, real‑world examples, common mistakes, difficulty, related concepts, explanations.
- Upgrade flashcard UI: glassmorphism, swipe gestures, favorite button, "AI Explain" button, hint/example reveal.
- Upgrade quiz UI: MCQ + True/False + Fill blanks, per‑question explanation & misconception, "harder/easier follow‑up" button.
- Exam Mode & Interview Mode as extra generated sections (2/5/10/15‑mark, beginner→expert).
- Revision pack: one‑page summary, cheat sheet, formula sheet, mind map (text/tree), last‑minute revision.
- AI Tutor chat panel with preset prompts (Explain simply, Analogy, Real‑world, etc.).

## Phase 2 — Accounts + persistence (needs Lovable Cloud)
- Email auth, per‑user study sets saved to DB.
- Dashboard: XP, streak, accuracy, study hours, weak/strong topics, weekly/monthly charts, recommended next topic.
- Gamification: XP awards, levels, badges, coins, daily streak, achievements, daily missions.
- Weakness detection + adaptive question selection (spaced repetition schedule stored per card).
- Study planner: exam date + hours → generated daily plan stored per user.

## Phase 3 — Polish
- Full a11y pass (keyboard, screen reader, high contrast, adjustable font size, color‑blind palette).
- Light mode + theme toggle.
- Skeleton loading everywhere, Framer Motion transitions.

## Technical notes
- Phase 1 stays fully client + existing `generateStudyMaterial` server fn; I'll expand its schema and split into 2–3 server fns (concept map, study pack, tutor chat) to keep responses fast.
- File parsing: PDF via `pdfjs-dist`, DOCX via `mammoth`, PPTX via `pptx-parser` — all in a server function so bundles stay small.
- Framer Motion added for animations.
- Phase 2 requires enabling **Lovable Cloud** (I'll prompt when we get there) for auth + Postgres tables (`study_sets`, `cards`, `attempts`, `xp_events`, `plans`).

## Confirm before I start
1. Start with **Phase 1** now? (rebrand + richer generation + file upload + tutor + exam/interview/revision UI)
2. OK to defer dashboard / XP / streaks / planner to Phase 2 (needs Cloud)?
3. Keep dark‑only for now, add light mode in Phase 3?
