FROM node:20-alpine

# Install FFmpeg for video processing
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Install dependencies based on the package manager lockfile
COPY app/package*.json ./
RUN npm install

# Copy application source
COPY app/ .

EXPOSE 3000

CMD ["npm", "run", "dev"]
