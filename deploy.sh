#!/bin/sh

cd react; npm run build ; npx wrangler pages deploy dist --project-name president-game
cd ..
cd cloudflare-server; npm run deploy
