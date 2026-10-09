FROM node:22-bookworm-slim AS build
WORKDIR /srv/scoretransposer
ENV NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=1536
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
COPY deploy/hetzner/build-frontends.mjs deploy/hetzner/public.env ./deploy/hetzner/
RUN npm run build -w @score/i18n && npm run build -w @score/shared && npm run build -w @score/ui && npm run build -w @score/storage && npm run build -w @score/runtime-database

FROM build AS frontend-build
ARG FRONTEND
RUN mkdir -p apps/${FRONTEND}/public && node deploy/hetzner/build-frontends.mjs ${FRONTEND}
RUN if [ "$FRONTEND" = "www" ]; then cd apps/www && npm run budget:homepage; fi

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

FROM build AS backend-compile
RUN npm run build -w @score/api && npm run build -w @score/worker

FROM scratch AS runtime-artifacts
COPY --from=backend-compile /srv/scoretransposer/packages/runtime-database/dist /runtime/packages/runtime-database/dist
COPY --from=backend-compile /srv/scoretransposer/packages/runtime-database/package.json /runtime/packages/runtime-database/package.json
COPY --from=backend-compile /srv/scoretransposer/packages/storage/dist /runtime/packages/storage/dist
COPY --from=backend-compile /srv/scoretransposer/packages/storage/package.json /runtime/packages/storage/package.json
COPY --from=backend-compile /srv/scoretransposer/packages/shared/dist /runtime/packages/shared/dist
COPY --from=backend-compile /srv/scoretransposer/packages/shared/package.json /runtime/packages/shared/package.json
COPY --from=backend-compile /srv/scoretransposer/packages/i18n/dist /runtime/packages/i18n/dist
COPY --from=backend-compile /srv/scoretransposer/packages/i18n/package.json /runtime/packages/i18n/package.json
COPY --from=backend-compile /srv/scoretransposer/services/api/dist /runtime/services/api/dist
COPY --from=backend-compile /srv/scoretransposer/services/api/package.json /runtime/services/api/package.json
COPY --from=backend-compile /srv/scoretransposer/services/worker/dist /runtime/services/worker/dist
COPY --from=backend-compile /srv/scoretransposer/services/worker/package.json /runtime/services/worker/package.json
COPY --from=backend-compile /srv/scoretransposer/services/worker/python /runtime/services/worker/python
