FROM node:20-alpine

WORKDIR /app

# Install dependencies based on the package manager lockfile
COPY app/package*.json ./
RUN npm ci

# Copy application source
COPY app/ .

EXPOSE 3000

CMD ["npm", "run", "dev"]
