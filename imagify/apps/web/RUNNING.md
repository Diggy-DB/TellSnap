# Running the Web App (No local Node needed)

This file explains two ways to run the scaffolded frontend without installing Node/pnpm locally.

## Option A — VS Code Dev Container (recommended)

1. Install the "Remote - Containers" (or "Dev Containers") extension in VS Code.
2. Open this repository in VS Code.
3. Click **Reopen in Container** when prompted (or use the Command Palette -> Dev Containers: Reopen in Container).
4. The container is based on Node 20 and will run `corepack prepare pnpm@8.8.0` and `pnpm install` automatically (see `.devcontainer/devcontainer.json`).
5. When the container is ready, open `http://localhost:3000` on your host machine to view the app.

## Option B — Docker Compose (quick CLI)

From the repo root:

```bash
# Build and start the web service in a container
docker compose -f infra/docker/docker-compose.dev.yml up --build

# Stop it later
docker compose -f infra/docker/docker-compose.dev.yml down
```

Notes:

- The Dockerfile mounts your workspace into the container so code changes reflect immediately (hot reload).
- If your system uses `docker-compose` rather than the Docker CLI, use the equivalent `docker-compose -f infra/docker/docker-compose.dev.yml up --build` command.

---

If you'd like, I can also add a VS Code `tasks.json` to start/stop the compose or a `launch.json` to debug the dev server from the editor.
