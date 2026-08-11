FROM node:18-slim

WORKDIR /app

# Install Python and Playwright dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    chromium \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxcb1 \
    libxkbcommon0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Install Node deps
COPY package*.json ./
RUN npm install --production

# Install Python deps
COPY python-bots/requirements.txt ./python-bots/
RUN pip3 install --break-system-packages -r python-bots/requirements.txt
RUN pip3 install --break-system-packages playwright
RUN playwright install chromium

# Copy all code
COPY src ./src
COPY python-bots ./python-bots

CMD ["node", "src/manager.js"]
