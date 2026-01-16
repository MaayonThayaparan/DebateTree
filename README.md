# DebateTree

A social, mobile-first discussion platform that structures debates into tree-like hierarchies with agree, disagree, and neutral nodes.

## Features

- **Structured Debates**: Organize discussions into clear agree/disagree/neutral response trees
- **Mobile-First Design**: Optimized for mobile with bottom sheet replies
- **Real-time Engagement**: Like/dislike topics and responses
- **User Authentication**: Secure login via Replit Auth
- **Dark/Light Themes**: Full theme support

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Replit Auth (OIDC)

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (DATABASE_URL, SESSION_SECRET)
4. Push database schema: `npm run db:push`
5. Start the app: `npm run dev`

## License

MIT
