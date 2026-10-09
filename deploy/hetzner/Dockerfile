FROM node:22-bookworm-slim AS build
WORKDIR /srv/scoretransposer
ENV NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=1024
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/app/package.json apps/app/package.json
COPY apps/www/package.json apps/www/package.json
COPY packages/i18n/package.json packages/i18n/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/storage/package.json packages/storage/package.json
COPY packages/runtime-database/package.json packages/runtime-database/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY services/api/package.json services/api/package.json
COPY services/worker/package.json services/worker/package.json
COPY services/collaboration/package.json services/collaboration/package.json
COPY services/cloudflare-gateway/package.json services/cloudflare-gateway/package.json
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY packages ./packages
COPY services ./services
COPY apps ./apps
COPY deploy/hetzner/build-frontends.mjs deploy/hetzner/public-build.json ./deploy/hetzner/
RUN npm run build -w @score/i18n && npm run build -w @score/shared && npm run build -w @score/ui && npm run build -w @score/storage && npm run build -w @score/runtime-database

FROM build AS backend-build
RUN npm run build -w @score/api && npm run build -w @score/worker && npm run build -w @score/collaboration
RUN npm prune --omit=dev --ignore-scripts --no-audit --no-fund

FROM node:22-bookworm-slim AS backend
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4000 NODE_OPTIONS=--max-old-space-size=192 \
    PYTHONUNBUFFERED=1 PYTHONUTF8=1 PATH=/opt/score-python/bin:$PATH
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates clamav clamav-freshclam ffmpeg python3 python3-venv util-linux && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/score-python && /opt/score-python/bin/pip install --no-cache-dir music21==10.5.0
COPY services/worker/python/requirements-preflight.txt /opt/requirements-preflight.txt
RUN python3 -m venv /opt/score-preflight && /opt/score-preflight/bin/pip install --no-cache-dir -r /opt/requirements-preflight.txt && /opt/score-preflight/bin/python -m pip check
ENV SCORE_PREFLIGHT_PYTHON_COMMAND=/opt/score-preflight/bin/python
WORKDIR /srv/scoretransposer
COPY --from=backend-build /srv/scoretransposer/node_modules ./node_modules
COPY --from=backend-build /srv/scoretransposer/packages ./packages
COPY --from=backend-build /srv/scoretransposer/services ./services
RUN mkdir -p /data/storage /srv/scoretransposer/runtime && chown -R node:node /data /srv/scoretransposer/runtime
ENV CLAMAV_COMMAND=/usr/bin/clamscan FFMPEG_COMMAND=/usr/bin/ffmpeg FFPROBE_COMMAND=/usr/bin/ffprobe MUSIC21_COMMAND=/opt/score-python/bin/python
USER node
CMD ["node", "services/api/dist/index.js"]

FROM build AS frontend-build
ARG FRONTEND
RUN mkdir -p apps/${FRONTEND}/public && node deploy/hetzner/build-frontends.mjs ${FRONTEND}

FROM node:22-bookworm-slim AS frontend
ARG FRONTEND
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 NODE_OPTIONS=--max-old-space-size=192
WORKDIR /srv/scoretransposer
COPY --from=frontend-build --chown=node:node /srv/scoretransposer/apps/${FRONTEND}/.next/standalone ./
COPY --from=frontend-build --chown=node:node /srv/scoretransposer/apps/${FRONTEND}/.next/static ./apps/${FRONTEND}/.next/static
COPY --from=frontend-build --chown=node:node /srv/scoretransposer/apps/${FRONTEND}/public ./apps/${FRONTEND}/public
ENV SCORE_FRONTEND=${FRONTEND}
USER node
CMD ["sh", "-c", "exec node apps/$SCORE_FRONTEND/server.js"]

