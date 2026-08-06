FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app code
COPY src ./src

# Create logs directory
RUN mkdir -p logs

# Start the manager bot
CMD ["node", "src/manager.js"]
