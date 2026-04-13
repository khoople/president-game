# President - The drinking card game

A multiplayer card game web app based on the classic "Scrum"/"President" card game. Built with a React 19 frontend and a Cloudflare Workers + Durable Objects backend.

One player creates a lobby, then provides the lobby code or link to other players to join. The lobby creator can then launch the game when all the desired players have connected to the lobby.

## Game rules

- Players take turns playing cards of equal or higher rank than the active hand
- Multiple cards of the same rank can be played, which will beat fewer cards.
- **Same rank** — Playing the same rank as the active hand skips the next player's turn
- **2** — Wild; clears the active hand. The same player takes another turn and can play anything
- **4** — Wild; does not clear the hand. The next player must still beat the hand played before the 4
- **Pass** — If all other players pass, the active hand is cleared and the last player to play cards opens freely
- Game ends when all players have run out of cards

## Monorepo structure

```
president/
├── react/                  # Frontend — React 19 + TypeScript + Vite
└── cloudflare-server/      # Backend — Cloudflare Workers + Durable Objects
```

## Frontend (`react/`)

### Setup

```bash
cd react
npm install
```

### Development

```bash
npm run dev
```

Starts the Vite dev server with HMR at `http://localhost:5173`. By default it connects to the backend at `http://localhost:8787`. To point at a different backend, set `VITE_API_URL` in a `.env.local` file:

```
VITE_API_URL=https://your-worker.workers.dev
```

### Build

Before building for production, copy the sample env file and set your backend URL:

```bash
cp .env.production.sample .env.production
# then edit .env.production and set VITE_API_URL to your Cloudflare Workers URL
```

`.env.production` is excluded from git. `.env.production.sample` is the committed template.

```bash
npm run build     # TypeScript compile + Vite bundle → dist/
npm run preview   # Preview the production build locally
npm run lint      # Run ESLint
```

## Backend (`cloudflare-server/`)

### Setup

```bash
cd cloudflare-server
npm install
```

### Development

```bash
npm run dev
```

Starts a local Wrangler dev server at `http://localhost:8787` (proxied to port 3000 by default). Durable Object state is held in memory locally.

Alternatively, run via Docker:

```bash
docker-compose up
```

### Deploy to Cloudflare

Requires `wrangler` to be authenticated:

```bash
npx wrangler login
```

**First deploy only** — set the production CORS origin as a secret so it never appears in source control. You will be prompted to paste the value:

```bash
npx wrangler secret put ALLOWED_ORIGIN
# enter your production frontend URL, e.g. https://your-app.pages.dev
```

Then deploy:

```bash
npm run deploy
```

The `ALLOWED_ORIGIN` secret is stored encrypted by Cloudflare and injected at runtime. For local development the value in `wrangler.toml` (`http://localhost:5173`) is used instead.

```bash
npm run cf-typegen   # Regenerate TypeScript types from wrangler.toml bindings
```

## Architecture

### Data flow

1. Player action → React calls a REST endpoint (`POST /game/play`, etc.)
2. Worker routes the request to the appropriate Durable Object
3. Durable Object delegates logic to `PresidentGameHost`
4. After each state change, the host pushes the full `PlayerState` to every connected WebSocket client
5. React receives the push and re-renders

### Backend files

| File | Purpose |
|------|---------|
| `src/index.ts` | Worker entry point; routes HTTP to Durable Objects |
| `src/president-do.ts` | Game Durable Object; manages WebSocket connections, persists state to SQLite |
| `src/lobby-do.ts` | Lobby Durable Object; manages lobby users, chat, and game start |
| `src/president-host/host.ts` | `PresidentGameHost`: orchestrates game lifecycle |
| `src/president-host/game.ts` | Shared TypeScript interfaces (`GameState`, `PlayerState`, `Play`, etc.) |
| `src/president-host/create-game.ts` | Shuffles deck and deals cards |
| `src/president-host/play.ts` | `applyPlay()`: validates and applies a card play to `GameState` |
| `src/president-host/player-state.ts` | `derivePlayerState()`: produces a per-player view of `GameState` |
| `src/president-host/card.ts` | Card/deck utilities; card codes are 2-char strings e.g. `"KH"` (King of Hearts) |

### Durable Objects

| Binding | Class | Purpose |
|---------|-------|---------|
| `PRESIDENT_DO` | `PresidentGameStateDurableObject` | One instance per game; owns game state and player WebSockets |
| `LOBBY_DO` | `LobbyDurableObject` | One instance per lobby; owns lobby state and lobby WebSockets |

### REST endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/lobby/start` | Create a new lobby |
| POST | `/lobby/join` | Join an existing lobby |
| POST | `/lobby/exit` | Leave a lobby |
| POST | `/lobby/update` | Update lobby status or gameId (host only) |
| POST | `/lobby/message` | Send a chat message |
| GET | `/lobby/lobby-state` | WebSocket: real-time lobby state stream |
| POST | `/game/start` | Start a new game from a lobby |
| POST | `/game/join` | Join an existing game |
| POST | `/game/play` | Play cards or pass |
| GET | `/game/player-state` | WebSocket: real-time player state stream |

### Key types

- **`GameState`** — Full server-side state: all player hands, discard pile, active hand, turn order
- **`PlayerState`** — Per-player view: own hand + opaque opponent data (card identities hidden)
- **Card codes** — Two characters: rank (`2`–`9`, `T`, `J`, `Q`, `K`, `A`) + suit (`H`, `D`, `C`, `S`)
