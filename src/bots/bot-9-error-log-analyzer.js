const Logger = require('../logger');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const fs = require('fs');

const logger = new Logger('bot-9-error-log-analyzer');

async function run() {
  try {
    logger.info('Starting error log analysis');

    if (!process.env.ANTHROPIC_API_KEY) {
      logger.warn('ANTHROPIC_API_KEY not set, skipping analysis');
      return { status: 'skipped', reason: 'ANTHROPIC_API_KEY not configured' };
    }

    // Read recent logs
    const logDir = path.join(__dirname, '../../logs');
    let logContent = '';

    try {
      if (fs.existsSync(logDir)) {
        const files = fs.readdirSync(logDir).slice(-5);
        for (const file of files) {
          const content = fs.readFileSync(path.join(logDir, file), 'utf-8');
          logContent += content + '\n';
        }
      }
    } catch (err) {
      logger.warn('Could not read log files', { error: err.message });
    }

    if (!logContent) {
      logger.info('No log files to analyze');
      return { status: 'ok', errorsFound: 0 };
    }

    // Parse errors from logs
    const errorLines = logContent
      .split('\n')
      .filter(line => line.includes('[ERROR]') || line.includes('error'));

    if (errorLines.length === 0) {
      logger.info('No errors found in recent logs');
      return { status: 'ok', errorsFound: 0 };
    }

    logger.info(`Found ${errorLines.length} error lines in logs`);

    // Use Claude to analyze if configured
    try {
      const client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `Analyze these error logs and categorize them. Identify: 1) New vs known errors 2) Severity (critical/warning/info) 3) Recommended action\n\n${errorLines.slice(0, 20).join('\n')}`,
          },
        ],
      });

      const analysis = response.content[0].text;
      logger.info('Error analysis complete', { analysis: analysis.substring(0, 200) });

      return {
        status: 'analyzed',
        errorsFound: errorLines.length,
        analysis: analysis.substring(0, 500),
        timestamp: new Date().toISOString(),
      };
    } catch (anthropicErr) {
      logger.warn('Claude analysis failed, returning raw error count', { error: anthropicErr.message });
      return {
        status: 'partial',
        errorsFound: errorLines.length,
        details: errorLines.slice(0, 5),
      };
    }
  } catch (error) {
    logger.error('Bot-9 failed', { error: error.message });
    throw error;
  }
}

module.exports = { run };
