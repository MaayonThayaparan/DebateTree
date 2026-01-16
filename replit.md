# DebateTree

## Overview

DebateTree is a social, mobile-first discussion platform that structures debates into tree-like hierarchies with agree, disagree, and neutral nodes. The application aims to make online conversations clearer and more organized compared to traditional flat comment systems. Users can create discussion topics, respond with categorized nodes, and engage through likes/dislikes. The platform targets a general audience from casual users to academics who want structured discourse.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom plugins for Replit integration
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Path Aliases**: `@/` for client source, `@shared/` for shared code

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful JSON APIs under `/api/*` prefix
- **Development**: Vite dev server with HMR proxied through Express
- **Production**: esbuild bundles server to CommonJS, Vite builds client to static files

### Data Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit with `db:push` command for schema sync

### Core Data Models
- **Users**: Authentication via Replit Auth (OIDC), stores profile info
- **Topics**: Main discussion starters with title, content, engagement counts
- **Nodes**: Hierarchical responses with type (agree/disagree/neutral), supports nesting via parentId
- **Reactions**: Like/dislike system for topics and nodes

### Authentication
- **Provider**: Replit Auth using OpenID Connect
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple
- **Implementation**: Passport.js with custom OIDC strategy in `server/replit_integrations/auth/`

### API Structure
- `GET /api/topics` - List topics with sort options (latest/trending/top)
- `GET /api/topics/search` - Search topics by query
- `GET /api/topics/:id` - Get single topic with author
- `POST /api/topics` - Create new topic (authenticated)
- `GET /api/topics/:id/nodes` - Get discussion nodes for topic
- `POST /api/nodes` - Create new node (authenticated)
- `POST /api/reactions` - Toggle like/dislike (authenticated)
- `GET /api/auth/user` - Get current authenticated user

## External Dependencies

### Database
- PostgreSQL database (connection via `DATABASE_URL` environment variable)
- Session table `sessions` for auth persistence
- Uses Drizzle ORM for type-safe queries

### Authentication
- Replit Auth (OIDC provider at `https://replit.com/oidc`)
- Requires `REPL_ID`, `SESSION_SECRET`, and `ISSUER_URL` environment variables

### Third-Party Packages
- **UI**: Radix UI primitives, Lucide icons, class-variance-authority
- **Forms**: React Hook Form with Zod validation
- **Dates**: date-fns for formatting
- **Carousel**: Embla Carousel React