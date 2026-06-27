# Minimal production image. Build:  docker build -t pr-quality-gate-bot .
# Run:  docker run -d -p 3000:3000 --env-file .env pr-quality-gate-bot
FROM node:20-alpine

WORKDIR /app

# Install only production deps first (better layer caching).
COPY package*.json ./
RUN npm install --omit=dev

# App source.
COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
