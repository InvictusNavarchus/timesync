# Timesync — Global Timezone Coordinator & Meeting Planner

Timesync is a modern, responsive visual timezone converter and meeting planner built with **SvelteKit**, **Svelte 5 Runes**, **Luxon**, **Fuse.js**, and **plain scoped CSS**.

---

## Features

- **Accurate IANA Projections**: Backed by Luxon for 100% precision across daylight saving transitions and fractional timezones (e.g., Kathmandu `+05:45`, Adelaide `+09:30`, Chatham `+12:45`).
- **Percentage-Based Meeting Scrubber**: Interactive meeting window that snaps to 30-minute increments across the 24-hour visual grid, supporting drag and edge resize handles without magic coordinate offsets.
- **Bidirectional URL Synchronization**: The entire board state (active timezones, anchor date, format, palette, theme, and meeting selection) stays synchronized with URL query parameters for seamless sharing.
- **Fast Fuzzy Search**: Instant client-side timezone search powered by Fuse.js over all canonical `Intl.supportedValuesOf("timeZone")` entries and popular city aliases (e.g., NYC, LA, SF, Tokyo).
- **Themes & Palettes**: Built-in Light and Dark modes with 4 dial color themes (`gray`, `teal`, `indigo`, `pink`) utilizing scoped CSS custom properties.
- **Reordering & Sorting**: Sort timezones West-to-East, East-to-West, Alphabetically, or customize order with one-click "Make Home" and row shift controls.
- **Zero Hydration Mismatch**: Configured in pure client SPA mode (`ssr = false`) to eliminate client/server timezone hydration glitches.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | SvelteKit 2 + Svelte 5 (Runes) |
| **Date & Time Engine** | Luxon |
| **Fuzzy Search** | Fuse.js |
| **Icons** | Lucide Svelte |
| **Styling** | Plain Modern CSS & CSS Custom Properties |
| **Package Manager** | Bun |
| **Adapter** | `@sveltejs/adapter-static` (SPA Mode) |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.0+)

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
