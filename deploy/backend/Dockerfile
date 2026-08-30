FROM node:22-bookworm

ARG AUDIVERIS_VERSION=5.10.2
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONUTF8=1 \
    PATH=/opt/score-python/bin:$PATH

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl ffmpeg fluidsynth fluid-soundfont-gm fonts-dejavu-core imagemagick \
    libsndfile1 libxtst6 musescore3 openjdk-17-jre-headless python3 python3-pip python3-venv \
    tesseract-ocr unzip && \
    rm -rf /var/lib/apt/lists/*

RUN curl -fsSL -o /tmp/audiveris.deb \
      "https://github.com/Audiveris/audiveris/releases/download/${AUDIVERIS_VERSION}/Audiveris-${AUDIVERIS_VERSION}-ubuntu22.04-x86_64.deb" && \
    dpkg --unpack /tmp/audiveris.deb && \
    sed -i '/^xdg-desktop-menu /d; /^xdg-mime /d' /var/lib/dpkg/info/audiveris.postinst && \
    dpkg --configure audiveris && \
    test -f /opt/audiveris/lib/app/Audiveris.cfg && \
    grep -Eiq '^java-options=-Xmx[0-9]+[gmk]$' /opt/audiveris/lib/app/Audiveris.cfg && \
    sed -Ei '/^java-options=-Xmx[0-9]+[gmk]$/Id' /opt/audiveris/lib/app/Audiveris.cfg && \
    ! grep -Eiq '^java-options=-Xmx' /opt/audiveris/lib/app/Audiveris.cfg && \
    rm -f /tmp/audiveris.deb

RUN python3 -m venv /opt/score-python && \
    /opt/score-python/bin/pip install --no-cache-dir "setuptools<81" music21==10.5.0 basic-pitch==0.4.0 yt-dlp && \
    /opt/score-python/bin/python -c "import music21; import basic_pitch" && \
    /opt/score-python/bin/yt-dlp --version

WORKDIR /srv/scoretransposer
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
RUN npm ci

COPY packages ./packages
COPY services ./services
COPY deploy/backend/soundfont-license-manifest.json deploy/backend/soundfont-license-manifest.json
COPY deploy/backend/licenses deploy/backend/licenses
RUN npm run build -w @score/i18n && npm run build -w @score/shared && npm run build -w @score/storage && npm run build -w @score/runtime-database && npm run build -w @score/api && npm run build -w @score/worker && npm run build -w @score/collaboration

ENV NODE_ENV=production \
    RUNTIME_DATABASE_PRIMARY=postgres \
    STORAGE_DIR=/data/storage \
    AUDIVERIS_COMMAND=/opt/audiveris/bin/Audiveris \
    AUDIVERIS_IMAGE_MAGICK_COMMAND=/usr/bin/convert \
    AUDIVERIS_MAX_HEAP_MB=4096 \
    OMR_PDF_RASTER_DPI=300 \
    OMR_PDF_MAX_PAGE_PIXELS=12000000 \
    OMR_PDF_MAX_TOTAL_PIXELS=120000000 \
    BASIC_PITCH_COMMAND=/opt/score-python/bin/basic-pitch \
    MUSIC21_COMMAND=/opt/score-python/bin/python \
    YT_DLP_COMMAND=/opt/score-python/bin/yt-dlp \
    FFMPEG_COMMAND=/usr/bin/ffmpeg \
    FFPROBE_COMMAND=/usr/bin/ffprobe \
    FLUIDSYNTH_COMMAND=/usr/bin/fluidsynth \
    QT_QPA_PLATFORM=offscreen \
    SOUNDFONT_PATH=/usr/share/sounds/sf2/FluidR3_GM.sf2 \
    SOUNDFONT_LICENSE_MANIFEST=/srv/scoretransposer/deploy/backend/soundfont-license-manifest.json \
    MUSESCORE_COMMAND=/usr/bin/musescore3

RUN mkdir -p /data/storage && chown -R node:node /data
USER node
COPY --chown=node:node deploy/cloudflare/container-worker-entrypoint.mjs /srv/scoretransposer/deploy/cloudflare/container-worker-entrypoint.mjs
EXPOSE 8080
CMD ["node", "deploy/cloudflare/container-worker-entrypoint.mjs"]
