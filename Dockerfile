FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies - try npm install first, fall back to basic install
RUN npm install || npm install --legacy-peer-deps || true

# Copy app code
COPY src ./src

# Create logs directory
RUN mkdir -p logs

# Start the manager bot
CMD ["npm", "start"]
