FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with fallback
RUN npm install --prefer-offline --no-audit || npm install

# Copy source code
COPY src ./src

# Create logs directory
RUN mkdir -p logs

# Start the bot manager
CMD ["npm", "start"]
