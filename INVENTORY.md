# Alio — Stage 0 Inventory

> Result of Figma scan: tokens, screens, components, and decisions before scaffolding.
> Source: Figma "Claude MCP" page (node `254:2088`), file `9oY1M8Eqn6c8KTJA0limuE`.

---

## Screens (8 total)

| # | Frame name | Node ID | Portal | Tab | Notes |
|---|---|---|---|---|---|
| 1 | Logs - initial screen | 254:2097 | Caregiver | Logs | Empty state, "Press to Speak" |
| 2 | Logs - when recording | 254:2152 | Caregiver | Logs | Live recording w/ transcript + Done |
| 3 | Logs - conversation | 254:2204 | Caregiver | Logs | Full conversation w/ task list |
| 4 | Logs - conversation collapsed | 254:2316 | Caregiver | Logs | Collapsed conversation view |
| 5 | Logs - conversatio history | 254:2429 | Caregiver | Logs | Past logs by date (Sarah's, Jassie's…) |
| 6 | Chat - initial page | 254:2503 | Caregiver + Family | Chat | Care circle conversation list |
| 7 | Home - caregiver info folded | 254:2609 | Family | Home | Caregiver "on the way" + vitals |
| 8 | Home - caregiver info collapse | 254:2787 | Family | Home | Caregiver arrived + 87 visits + vitals |

## Design tokens (extracted)

### Colors

**Primary / brand**
- `--brand-primary` = `#5e69f6` (purple/indigo — main brand color)
- `--brand-accent` = `#c0da5a` (lime green)
- `--brand-tint-1` = `#ededfc` (lavender bg tint)
- `--brand-tint-2` = `#eaeaf2` (cool gray bg)
- `--brand-border` = `#d3d5ec` (purple-gray border)

**Neutrals / Gray palette** (from Figma variables)
- `--gray-10` = `#FFFFFF`
- `--gray-30` = `#EDEDED`
- `--gray-60` = `#9E9E9E`
- `--gray-100` = `#0A0A0A`
- Plus inline: `#181818`, `#28292c` (charcoals — promote to `--gray-80`, `--gray-90`)

**Semantic**
- `--alert-red` = `#FF3B30` (iOS system red — used for alerts/errors)
- `--info-blue` = `#1C4EAB` (only seen on collapsed Home state)

### Typography

- **Font family**: **Century Gothic** (Bold + Regular)
- **⚠️ Decision needed:** Century Gothic is a paid Microsoft font — not on Google Fonts. Options:
  - (a) Use a free geometric sans alternative (e.g., **Nunito**, **Quicksand**, or **URW Gothic** via fontshare)
  - (b) Self-host a licensed Century Gothic webfont (requires license + budget)
  - (c) Use Apple SF Pro / system fonts only (mobile prototype only, but loses brand on share)
- **Sizes used** (rounded to clean values): `10, 12, 14, 16, 18, 20, 24` — will define as `--text-xs, sm, base, md, lg, xl, 2xl`
- **Weights**: Regular (400), Semibold (600), Bold (700)

### Border radii

- `--radius-sm` = `3px`
- `--radius-md` = `8px`
- `--radius-lg` = `12px` (matches Figma `button` variable)
- `--radius-xl` = `14px`
- `--radius-2xl` = `24px`
- `--radius-full` = `9999px` (circles, pills)

### Spacing

Inferred from layout — will define standard scale: `4, 8, 12, 16, 20, 24, 32, 40, 48` (px). Tailwind default scale aligns well.

## Components to build (in `packages/ui`)

From content patterns across the 8 screens:

**Layout / shell**
- `MobileFrame` — phone viewport container (375-393px wide) for desktop preview
- `StatusBar` — iOS-style status bar (time, signal, battery) at top of each screen
- `TabBar` — bottom nav with 4 icon+label slots (Container at y=767 in metadata)
- `ScreenHeader` — top of-screen header with title and right action

**Surfaces**
- `Card` — primary content card (rounded-lg, white bg)
- `Section` — labeled content group with optional count badge

**Interactive**
- `Button` — primary/secondary/ghost variants, with `--radius-lg = 12px`
- `IconButton` — circular icon button (used for keyboard, share, voice)
- `PressToSpeakButton` — large center voice button (Caregiver Logs flow)

**Data display**
- `Avatar` — with size variants (sm/md/lg)
- `VitalRow` — "Heart Rate · 120 bpm" pattern (used 4+ times on Home)
- `MedicationRow` — pill row with dose + frequency
- `LogListItem` — "Sarah's Log · 2026/4/5 13:03"
- `ChatListItem` — avatar + name + last message + time + unread count
- `Message` — chat bubble (incoming/outgoing variants)
- `TranscriptLine` — voice transcript line w/ timestamp

**Status / feedback**
- `LiveTrackingPill` — "Caregiver on the way" / "Caregiver arrived" status banner
- `WaveformAnimation` — animated bars for voice recording state

## Icons

- Source in Figma: **"Iconography - Caesarzkn"** (Figma community icon library)
- Plan: map to **Lucide React** (open-source, MIT, ~1400 icons, similar style). When an exact match is missing, fall back to closest equivalent and flag in commit.
- Specific icons seen so far: voice, message, calendar, share, keyboard, search, medication, heart, settings, chat

## Build order (recommended)

Following the "primitives before pages" rule:

1. Scaffold monorepo (apps/caregiver, apps/family, packages/ui, packages/theme, packages/mock-data)
2. Write `packages/theme` from tokens above
3. Build `MobileFrame`, `StatusBar`, `TabBar`, `Card`, `Button`, `IconButton`, `Avatar` in `packages/ui`
4. Build routing skeletons (Family: Home + Chat tabs; Caregiver: Home + Logs + Chat tabs)
5. Implement screens in this order (simplest → most complex):
   - **Logs - initial screen** (simplest — voice empty state)
   - **Logs - when recording** (adds animation)
   - **Logs - conversation** (adds message list)
   - **Logs - conversation collapsed** (collapse variant)
   - **Logs - conversatio history** (list of past logs)
   - **Home - caregiver info folded** (most card density)
   - **Home - caregiver info collapse** (state variant)
   - **Chat - initial page** (real-time chat illusion)

## Open decisions before scaffolding

1. **Font choice** — pick (a), (b), or (c) above. Default I'll use if you don't choose: **(a) Nunito** from Google Fonts as a free Century-Gothic alternative.
2. **Icon library** — confirm Lucide React, or specify another. Default: **Lucide React**.
3. **Monorepo name** — package name in `package.json`. Default: `alio` (matches product name).

---

**Status:** Ready to scaffold pending answers to the 3 decisions above. Tokens captured. Components inventoried. Screens mapped.
