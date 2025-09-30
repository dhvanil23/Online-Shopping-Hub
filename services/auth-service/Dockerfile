FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY services/auth-service/ ./
COPY shared/ ../shared/

EXPOSE 3001

CMD ["node", "server.js"]