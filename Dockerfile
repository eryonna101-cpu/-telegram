FROM node:20-slim

# FFmpeg + yt-dlp (يحتاجان Python)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg python3 python3-pip && \
    pip install --break-system-packages --no-cache-dir yt-dlp && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY app ./app

RUN mkdir -p data downloads logs

CMD ["node", "app/main.js"]