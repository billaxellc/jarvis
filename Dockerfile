FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY src ./src
COPY manager.js ./manager.js

CMD ["node", "manager.js"]
