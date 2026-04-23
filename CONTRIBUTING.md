# Contributing to Vekt

Thanks for your interest in contributing.

## Prerequisites

- Node.js 20+
- pnpm 10+

## Local Setup

```bash
git clone https://github.com/Behnoudmst/vekt.git
cd vekt
pnpm install
cp .env.example .env
pnpm run db:migrate
pnpm run db:seed
pnpm run dev
```

## Development Commands

```bash
pnpm run dev          # Start development server
pnpm run lint         # Run ESLint
pnpm run build        # Verify production build
pnpm run db:migrate   # Apply Prisma migrations
pnpm run db:generate  # Regenerate Prisma client
pnpm run db:seed      # Seed development data
```

## Project Conventions

- Use existing `components/ui/` components (shadcn/ui) instead of raw UI elements when equivalent components exist.
- Validate user input with Zod schemas in `lib/schemas.ts`.
- Use `auth()` from `lib/auth.ts` and enforce role checks where required.
- Keep file access to resumes behind `/api/uploads/[filename]`; do not expose `private/uploads/` directly.
- Use structured logging with `lib/logger.ts`.

If you change `schema/schema.prisma`, run:

```bash
pnpm run db:migrate
pnpm run db:generate
```

## Pull Request Guidelines

1. Keep changes focused and scoped to one concern.
2. Run `pnpm run lint` and `pnpm run build` before opening a PR.
3. Include a clear description of what changed and why.
4. Add screenshots for UI changes when relevant.
5. Reference related issues when applicable.

## Commit Guidelines

- Write clear, descriptive commit messages.
- Prefer small, reviewable commits over large mixed changes.

## Reporting Bugs

When opening an issue, include:

- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, Node version, package manager)
- Logs or screenshots if available

## Security

Please do not open public issues for security vulnerabilities.
Report sensitive security issues privately to the maintainers.
