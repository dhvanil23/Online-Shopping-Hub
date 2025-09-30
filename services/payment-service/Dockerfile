FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY services/payment-service/ ./
COPY shared/ ../shared/

EXPOSE 3004

CMD ["node", "server.js"]