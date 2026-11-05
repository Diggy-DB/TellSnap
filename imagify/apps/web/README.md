# StoryForge — Web (Minimal Scaffold)

This is a small scaffolded frontend with Tailwind and a few UI components (Player, Timeline, Scene Bible, etc).

Quick start:

1. cd apps/web
2. pnpm install
3. pnpm dev

Notes:

- This is intentionally minimal and focused on visual components and theming.
- The components are small and separated into their own files to keep code readable.

Files created:

- `app/page.tsx`, `app/layout.tsx`
- `src/components/*` (small, focused components)
- `src/styles/globals.css`, `src/design/tokens.ts`, `src/lib/theme.ts`
- `tailwind.config.cjs`, `postcss.config.cjs`, `tsconfig.json`, `package.json`

Next steps:

- Wire up real data, add tests, and integrate into a monorepo workspace (if desired).
