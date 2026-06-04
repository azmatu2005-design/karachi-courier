# Karachi Courier

Same-day courier platform for Karachi, organized as a **pnpm monorepo**.

## Structure

```
karachi-courier/
├── apps/
│   ├── backend/           # REST API (Express + TypeScript)
│   ├── ops-dashboard/     # Internal operations (Next.js 14)
│   ├── business-portal/   # Merchant booking & management (Next.js 14)
│   ├── tracking/          # Public shipment tracking (Next.js 14)
│   └── rider-app/         # Rider mobile app (Expo + React Native)
└── packages/
    └── shared/            # Shared types and utilities
```

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 9+

## Setup

Install [pnpm](https://pnpm.io/installation) (or use `npx pnpm@9.15.0`).

```bash
pnpm install
```

On Windows, this repo uses a hoisted `node-linker` (see `.npmrc`) to avoid symlink permission errors. If `pnpm install` fails with `EPERM` on symlinks, enable **Developer Mode** or run the terminal as Administrator, then retry.

Generate Expo rider assets (if missing):

```bash
node scripts/create-expo-assets.mjs
```

## Development

| App | Command | Default URL |
|-----|---------|-------------|
| API | `pnpm dev:backend` | http://localhost:4000 |
| Ops dashboard | `pnpm dev:ops` | http://localhost:3001 |
| Business portal | `pnpm dev:business` | http://localhost:3002 |
| Tracking | `pnpm dev:tracking` | http://localhost:3003 |
| Rider app | `pnpm dev:rider` | Expo dev tools |

Or run from each app directory:

```bash
pnpm --filter @karachi-courier/backend dev
```

## Build

```bash
pnpm build
```

## Shared package

Import shared types and helpers in any workspace app:

```ts
import { OrderStatus, formatTrackingId } from "@karachi-courier/shared";
```

## License

Private — all rights reserved.
