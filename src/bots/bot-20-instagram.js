/**
 * Bot 20: Instagram Engagement Bot
 * Spawns Python Instagram bot as child process
 * Runs continuously - comments on posts in hashtags
 */

const { spawn } = require('child_process');
const path = require('path');

async function run() {
  return new Promise((resolve) => {
    const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
    const scriptPath = path.join(__dirname, '..', '..', 'python-bots', 'instagram-bot.py');
    
    console.log('[bot-20-instagram] Starting Python Instagram bot...');
    
    const python = spawn(pythonPath, [scriptPath], {
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    python.on('error', (err) => {
      console.log(`[bot-20-instagram] [ERROR] ${err.message}`);
      resolve({ success: false, error: err.message });
    });
    
    python.on('exit', (code) => {
      console.log(`[bot-20-instagram] [EXIT] Code ${code}`);
      resolve({ success: code === 0 });
    });
    
    // Allow 10 min runs
    setTimeout(() => resolve({ success: true, message: 'Still running' }), 10 * 60 * 1000);
  });
}

module.exports = { run };
