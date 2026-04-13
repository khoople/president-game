# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

President is a real-time multiplayer card game (the card game "President"/"Scum"). It is a monorepo with two independent apps:

- `react/` — Frontend: React 19 + TypeScript + Vite
- `cloudflare-server/` — Backend: Cloudflare Workers + Durable Objects

## Commands

### React Frontend (`react/`)
```bash
npm run dev       # Vite dev server with HMR
npm run build     # TypeScript compile + Vite bundle
npm run lint      # ESLint
npm run preview   # Preview production build
```

### Cloudflare Server (`cloudflare-server/`)
```bash
npm run dev       # Local Wrangler dev server (port 8787)
npm run deploy    # Deploy to Cloudflare Workers
npm run cf-typegen  # Regenerate types from wrangler.toml
```

```bash
docker-compose up  # Alternative: run server via Docker
```

## Architecture

### Data Flow
1. Player action → React calls REST endpoint (`POST /game/play`, etc.)
2. Worker routes to Durable Object
3. Durable Object delegates logic to `PresidentGameHost` or `LobbyHost`
4. After state change, host pushes full `PlayerState`/`LobbyState` to all connected WebSocket clients
5. React receives WebSocket push and re-renders

### Backend (`cloudflare-server/src/`)
- `index.ts` — Worker entry point; routes HTTP requests to Durable Objects
- `president-do.ts` — Game Durable Object; manages WebSocket connections, persists `GameState`, delegates to `PresidentGameHost`
- `lobby-do.ts` — Lobby Durable Object; manages WebSocket connections, persists `LobbyState`, delegates to `LobbyHost`
- `president-host/game.ts` — `PresidentGameHost`: orchestrates `startGame`, `joinGame`, `makePlay`, `getPlayerState`
- `president-host/lobby.ts` — `LobbyHost`: orchestrates `startLobby`, `joinLobby`, `exitLobby`, `sendMessage`, `updateLobby`
- `president-host/types.ts` — Shared TypeScript types for game and lobby (`GameState`, `PlayerState`, `LobbyState`, etc.)
- `president-host/create-game.ts` — Shuffles deck, deals cards to players
- `president-host/play.ts` — `applyPlay()`: validates and applies a card play to `GameState`
- `president-host/player-state.ts` — `derivePlayerState()`: transforms `GameState` into a player-specific view (hides opponent card identities)
- `president-host/card.ts` — Card/deck utilities; card codes are 2-char strings like `"KH"` (King of Hearts)

### Frontend (`react/src/`)
- `config.ts` — API base URL; reads `VITE_API_URL` env var, falls back to `http://localhost:8787`
- `api/game.ts` — Typed fetch wrappers for game REST endpoints
- `api/lobby.ts` — Typed fetch wrappers for lobby REST endpoints
- `api/socket-handler.ts` — `getSocketHandler()`: WebSocket wrapper with exponential-backoff auto-reconnect
- `president-client/types.ts` — Shared frontend types (`LobbyState`, `LobbyUser`, `PlayerState`, etc.)
- `president-client/card.ts` — Card utilities: `parseCard`, `sortHand`
- `App.tsx` — Top-level state; manages lobby and game WebSocket connections; renders lobby or game screens
- `components/lobby/` — Lobby screens (`LobbyHome`, `LobbyRoom`, `LobbyTitle`)
- `components/game/` — Game display components; all styling is inline CSS

### REST Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/lobby/start` | Create a new lobby |
| POST | `/lobby/join` | Join an existing lobby |
| POST | `/lobby/exit` | Leave a lobby |
| POST | `/lobby/update` | Update lobby status or gameId (host only) |
| POST | `/lobby/message` | Send a chat message |
| GET | `/lobby/lobby-state` | WebSocket: real-time lobby state stream |
| POST | `/game/start` | Start a new game from a lobby |
| POST | `/game/join` | Player joins an existing game |
| POST | `/game/play` | Player plays cards or passes |
| GET | `/game/player-state` | WebSocket: real-time player state stream |

### Key Types
- `GameState` — Full server-side state (all player hands, discard, active hand, turn indicator)
- `PlayerState` — Per-player view: own hand + opaque opponent data (derived server-side, never exposes opponent cards)
- Card codes: two chars, rank (`2`–`9`, `T`, `J`, `Q`, `K`, `A`) + suit (`H`, `D`, `C`, `S`)

### WebSockets
The Durable Object uses Cloudflare's WebSocket hibernation API. After any state change, it serializes and pushes the full `PlayerState` to each connected player's socket. Hibernation attachment data is used to identify which player each socket belongs to.
