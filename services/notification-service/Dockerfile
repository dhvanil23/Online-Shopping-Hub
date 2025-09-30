FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY services/notification-service/ ./
COPY shared/ ../shared/

EXPOSE 3005

CMD ["node", "server.js"]