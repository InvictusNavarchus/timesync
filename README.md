# Timesync — Global Timezone Coordinator & Meeting Planner

Timesync is a modern, responsive visual timezone converter and meeting planner built with **SvelteKit**, **Svelte 5 Runes**, **Luxon**, **Fuse.js**, **countries-and-timezones**, and **plain scoped CSS**.

---

## Features

- **Accurate IANA Projections**: Backed by Luxon for 100% precision across daylight saving transitions and fractional timezones (e.g., Kathmandu `+05:45`, Adelaide `+09:30`, Chatham `+12:45`).
- **Interactive Meeting Scrubber**: Interactive meeting window that snaps to 30-minute increments across the 24-hour visual dial strip, supporting drag and edge resize handles.
- **Bidirectional URL Synchronization**: The entire board state (active timezones, anchor date, format, palette, theme, sort strategy, and meeting selection) stays synchronized with URL query parameters for seamless sharing.
- **Fail-Soft Local Persistence**: Preferences (theme, palette, 12h/24h format, sort order, and preferred home zone) and the last active board persist automatically to `localStorage` with fail-soft degradation for private browsing.
- **Saved Boards & Presets**: Save recurring team setups or event configurations with custom names, meeting windows, and optional pinned dates, with instant switching and deletion.
- **Data Portability & Backup**: Complete JSON export and validated import to migrate saved boards and preferences across devices without requiring an external backend.
- **Fast Fuzzy Search & Recents**: Instant client-side timezone search powered by Fuse.js and `countries-and-timezones`, featuring a one-click "Recently Added" quick list when focused.
- **Themes & Palettes**: Built-in Light and Dark modes with 6 dial color themes (`gray`, `teal`, `indigo`, `pink`, `blue`, `purple`) utilizing CSS custom properties.
- **Sorting Presets**: Sort active timezones West-to-East (Ascending), East-to-West (Descending), Alphabetically (A–Z), or preserve the chronological order added.
- **Zero Hydration Mismatch & Multi-Tab Sync**: Configured in pure client SPA mode (`ssr = false`) with live storage event listeners that synchronize preferences and saved boards across browser tabs.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | SvelteKit 2 + Svelte 5 (Runes) |
| **Date & Time Engine** | Luxon |
| **Fuzzy Search** | Fuse.js |
| **Geographic Metadata** | `countries-and-timezones` |
| **Icons** | Lucide Svelte |
| **Styling** | Plain Modern CSS & CSS Custom Properties |
| **Build Tool** | Vite 8 |
| **Package Manager** | Bun |
| **Adapter** | `@sveltejs/adapter-static` (SPA Mode) |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.3+)

### Installation

```bash
git clone https://github.com/InvictusNavarchus/timesync.git
cd timesync
bun install
```

### Development

```bash
bun run dev
```

### Type Checking

```bash
bun run typecheck
```

### Production Build

```bash
bun run build
bun run preview
```

Static build output is generated in `build/` and ready for deployment to Cloudflare Pages, Vercel, GitHub Pages, or any static host.
