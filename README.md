# Alio

> AI copilot for elder care connecting seniors, caregivers, and adult children.
> *"When you can't be there, Alio is."*

This repo holds the **UI prototype** for Alio. Backend (FastAPI + Gemma LLM + auth + persistence) is the next phase — most "live" features are mocked at the UI layer with typed fixtures that act as the data contract.

## Quick start

```bash
# 1. Install pnpm if you don't have it
npm install -g pnpm   # or: corepack enable && corepack prepare pnpm@latest --activate

# 2. Install dependencies
pnpm install

# 3. Run both apps in parallel
pnpm dev

# Caregiver portal → http://localhost:3001
# Family portal    → http://localhost:3002
```

Run one app at a time:

```bash
pnpm dev:caregiver    # localhost:3001
pnpm dev:family       # localhost:3002
```

## What's in the box

```
.
├── apps/
│   ├── caregiver/         Next.js 14 App Router app (port 3001)
│   └── family/            Next.js 14 App Router app (port 3002)
├── packages/
│   ├── theme/             Design tokens + Tailwind preset + Century Gothic fonts + globals.css
│   ├── ui/                Shared components + 288 generated Caesarzkn icons
│   └── mock-data/         Typed fixtures — implicit data contract for the engineer
├── icons/                 SVG source files for the icon generator (one-time use)
├── scripts/
│   └── generate-icons.mjs Regenerates packages/ui/src/icons/*.gen.tsx from icons/
└── .figma-refs/           Reference screenshots from Figma (visual diff baseline)
```

## Source-of-truth docs

| File | What |
|---|---|
| [CLAUDE.md](CLAUDE.md) | House rules — read first if you're picking this up |
| [PLAN.md](PLAN.md) | Original build plan + scope |
| [DESIGN.md](DESIGN.md) | Design system (colors, type, radii, spacing, text styles, animations) |
| [INVENTORY.md](INVENTORY.md) | Screen inventory from initial Figma extraction |

## Tech stack

- **Next.js 14** App Router + React 18 + TypeScript
- **Tailwind CSS** with a shared preset from `@alio/theme`
- **pnpm workspaces** monorepo
- **Century Gothic** webfont, loaded via `next/font/local` from `packages/theme/fonts/`
- **No backend yet** — every API-like surface is a mock in `@alio/mock-data`

## App structure

Each app has its own tab bar (different sets of tabs per portal):

**Caregiver portal** (port 3001)
- `/home` — patient schedule with expandable patient cards (avatar, map, emergency contacts)
- `/logs` — voice-first AI logging (idle/recording/conversation) + `/logs/history` past visits
- `/chat` — care circle threads + `/chat/[id]` 1:1 conversations
- `/profiles` — placeholder

**Family portal** (port 3002)
- `/home` — caregiver status card (folded/expanded states) + Today's Status vitals + calendar + upcoming appointments
- `/ai-check` — full AI flow: voice (Alio voice ▾) → recording → message conversation (Patient ▾) with image recognition + text input
- `/chat` — placeholder
- `/records` — placeholder

## For the engineer

The frontend is structured so the data layer is the only thing that needs to change when real backends come online:

- All mock data lives in `packages/mock-data/src/index.ts` — typed `Patient`, `Caregiver`, `ChatThread`, `ChatMessage`, `ConversationTurn`, `Vital`, `Appointment`, etc.
- Replace those exports with real queries against your Supabase / Gemma / FastAPI services
- Screens import named fixtures (e.g. `SAMPLE_PATIENTS`) — swap each for a hook (`usePatients()`) returning the same shape and screens will continue rendering

The simulated transcript stream in `/ai-check` and `/logs` is wall-clock-based — wire it to real STT events when the AI service lands.

## Icons

288 Caesarzkn icons + a handful of custom ones live in `packages/ui/src/icons/`. To regenerate from SVGs in `/icons/`:

```bash
pnpm icons:generate
```

The generator (`scripts/generate-icons.mjs`) normalizes hardcoded colors to `currentColor` so icons can be themed via CSS.

## Design assets

- Figma file (reference): `9oY1M8Eqn6c8KTJA0limuE` — ask in the team for access.
- Local screenshots from Figma (visual diff baseline): `.figma-refs/`

## Status

- ✅ Phase 1 UI prototype: caregiver Home + Logs + Chat, family Home + AI Check
- ⏳ Phase 2: backend wiring (you're here)
- ⏳ Phase 3: Elder portal
