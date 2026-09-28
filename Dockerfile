FROM node:20-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-pip ffmpeg curl && \
    pip install --break-system-packages --no-cache-dir yt-dlp && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY .env ./
COPY app ./app

RUN mkdir -p data downloads logs

CMD ["node", "app/main.js"]
