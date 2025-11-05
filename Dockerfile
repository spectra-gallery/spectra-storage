FROM node:18-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production || npm install --production

COPY . .

ENV NODE_ENV=production \
    APP_ENV=production

EXPOSE 6601

CMD ["npm", "run", "start:prod"]

