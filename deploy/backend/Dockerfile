FROM node:22-bookworm

ARG AUDIVERIS_VERSION=5.10.2
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONUTF8=1 \
    PATH=/opt/score-python/bin:$PATH

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl ffmpeg fluidsynth fluid-soundfont-gm fonts-dejavu-core \
    libsndfile1 musescore3 openjdk-17-jre-headless python3 python3-pip python3-venv \
    tesseract-ocr unzip && \
    curl -fsSL -o /tmp/audiveris.deb \
      "https://github.com/Audiveris/audiveris/releases/download/${AUDIVERIS_VERSION}/Audiveris-${AUDIVERIS_VERSION}-ubuntu22.04-x86_64.deb" && \
    apt-get install -y /tmp/audiveris.deb && \
    python3 -m venv /opt/score-python && \
    /opt/score-python/bin/pip install --no-cache-dir "setuptools<81" music21==10.5.0 basic-pitch==0.4.0 yt-dlp && \
    rm -rf /var/lib/apt/lists/* /tmp/audiveris.deb

WORKDIR /srv/scoretransposer
COPY package.json package-lock.json ./
COPY apps/app/package.json apps/app/package.json
COPY apps/www/package.json apps/www/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/storage/package.json packages/storage/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY services/api/package.json services/api/package.json
COPY services/worker/package.json services/worker/package.json
COPY services/collaboration/package.json services/collaboration/package.json
RUN npm ci

COPY packages ./packages
COPY services ./services
RUN npm run build -w @score/shared && npm run build -w @score/storage && npm run build -w @score/api && npm run build -w @score/worker && npm run build -w @score/collaboration

ENV NODE_ENV=production \
    DB_FILE=/data/app.sqlite \
    STORAGE_DIR=/data/storage \
    AUDIVERIS_COMMAND=/opt/audiveris/bin/Audiveris \
    BASIC_PITCH_COMMAND=/opt/score-python/bin/basic-pitch \
    MUSIC21_COMMAND=/opt/score-python/bin/python \
    YT_DLP_COMMAND=/opt/score-python/bin/yt-dlp \
    FFMPEG_COMMAND=/usr/bin/ffmpeg \
    FLUIDSYNTH_COMMAND=/usr/bin/fluidsynth \
    SOUNDFONT_PATH=/usr/share/sounds/sf2/FluidR3_GM.sf2 \
    MUSESCORE_COMMAND=/usr/bin/musescore3

RUN mkdir -p /data/storage && chown -R node:node /data /srv/scoretransposer
USER node
