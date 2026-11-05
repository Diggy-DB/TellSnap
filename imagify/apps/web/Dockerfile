FROM node:20-bullseye

# Create app directory
WORKDIR /workspace/apps/web

# Enable corepack so pnpm is available
RUN corepack enable && corepack prepare pnpm@8.8.0 --activate

# Copy package manifests and install deps (cache layer)
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

# Copy rest of app
COPY . .

EXPOSE 3000

CMD ["pnpm", "dev"]
