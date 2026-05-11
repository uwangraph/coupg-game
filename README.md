# Coup Online — Svelte 5 + Cloudflare

Game Coup multiplayer realtime menggunakan **Svelte 5** (Runes) di frontend dan **Cloudflare Workers + Durable Objects** di backend.

## Arsitektur

```
frontend/          ← Svelte 5 (Vite)
  src/
    App.svelte
    lib/store.svelte.ts   ← Reactive WebSocket state (Runes)
    routes/
      Lobby.svelte
      Waiting.svelte
      Game.svelte
      GameOver.svelte

worker/            ← Cloudflare Workers
  src/
    index.ts       ← HTTP router + Durable Object entry
    game.ts        ← Engine permainan (pure functions)
    types.ts       ← Shared types
  wrangler.toml
```

## Cara Kerja Realtime

- **Durable Object** (`GameRoom`) — satu instance per room, menyimpan state game
- **WebSocket** — setiap pemain terhubung langsung ke Durable Object roomnya
- **State disanitasi** — setiap pemain hanya melihat kartunya sendiri; kartu lawan disembunyikan
- **Reconnect otomatis** — jika koneksi putus, frontend retry dengan exponential backoff

## Setup & Jalankan

### Prasyarat
- Node.js 20+
- Akun Cloudflare (gratis)

### 1. Install dependencies

```bash
npm install
cd worker && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Jalankan development

```bash
# Terminal 1 — Cloudflare Worker (port 8787)
cd worker
npx wrangler dev

# Terminal 2 — Frontend Svelte (port 5173)
cd frontend
npm run dev
```

Buka http://localhost:5173 — Vite sudah di-proxy ke Worker untuk `/rooms/*`.

### 3. Deploy ke Cloudflare

```bash
# Deploy worker
cd worker
npx wrangler deploy

# Build & deploy frontend (Cloudflare Pages)
cd frontend
npm run build
# Upload folder dist/ ke Cloudflare Pages

# Update vite.config.ts: ganti proxy target ke URL worker yang sudah di-deploy
```

## Aturan Game

| Aksi | Kartu | Efek | Bisa Ditantang? | Bisa Diblok oleh? |
|------|-------|------|----------------|-------------------|
| Income | — | +1 koin | ✗ | — |
| Foreign Aid | — | +2 koin | ✗ | Duke |
| Tax | Duke | +3 koin | ✓ | — |
| Assassinate | Assassin | Bayar 3, target buang kartu | ✓ | Contessa |
| Steal | Captain | Curi 2 koin | ✓ | Captain, Ambassador |
| Exchange | Ambassador | Tukar kartu dari deck | ✓ | — |
| Coup | — | Bayar 7, paksa target buang kartu | ✗ | — |

## Flow Aksi

```
Pemain memilih aksi
  → Fase Challenge (semua bisa tantang / lewat)
    → Jika ada tantangan: cek kartu
    → Jika tidak ada: Fase Block (jika bisa diblok)
      → Jika ada blok: Fase Block-Challenge
      → Jika tidak ada: Aksi dieksekusi
```

## WebSocket Message Protocol

### Client → Server
```ts
{ type: "join", name: string }
{ type: "start_game" }
{ type: "action", action: ActionType, targetId?: string }
{ type: "challenge" }
{ type: "pass" }
{ type: "block", character: Character }
{ type: "challenge_block" }
{ type: "accept_block" }
{ type: "lose_influence", cardIndex: number }
{ type: "exchange_select", cardIndexes: number[] }
```

### Server → Client
```ts
{ type: "state", state: GameStateView }  // setiap perubahan state
{ type: "error", message: string }
```
