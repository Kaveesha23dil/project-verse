# ProjectVerse

University research and innovation marketplace built with React, Vite, Express and MySQL.

## Run locally

Requires Node.js and MySQL.

1. Copy `server/.env.example` to `server/.env` and configure your database and JWT secret.
2. Install dependencies with `npm install` in both `server` and `client`.
3. Import the schema and seed SQL files into a new database. `npm run db:setup` in `server` initializes a fresh database; do not run it against a database containing work you need to retain.
4. For an existing database, run `node scripts/migrate-project-visibility.js` in `server`.
5. Run `npm run dev` in `server`, then `npm run dev` in `client`.

Frontend: http://localhost:5173. Backend: http://localhost:4000.

## Features

- Publication submission and admin moderation
- Marketplace, shopping cart and orders
- Collaboration and investment requests
- Admin AI Review Assistant using Groq
- Admin project deletion and timed visibility controls

AI setup is documented in [server/AI-REVIEW.md](server/AI-REVIEW.md).

## Hosting

The frontend can be deployed as a Render static site with root directory `client`, build command `npm install && npm run build`, and publish directory `dist`. Set `VITE_API_URL` to your backend URL followed by `/api`. Add a rewrite from `/*` to `/index.html`.

Deploy the backend as a Render web service with root directory `server`, build command `npm install`, and start command `npm start`. Set the environment variables from `server/.env.example` in the hosting dashboard. Set `CLIENT_URL` to the frontend origin and `DB_SSL=true` for a hosted MySQL database such as Aiven.

Never commit API keys or database credentials. Seed files contain demonstration accounts; replace or disable those accounts before a public deployment.
