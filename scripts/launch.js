const { spawn } = require('child_process');
const path = require('path');

/**
 * Wrapper to invoke PowerShell scripts from npm run without cmd.exe mangling arguments.
 * Usage: node scripts/launch.js <script-name.ps1> [args...]
 */

const scriptName = process.argv[2];
const args = process.argv.slice(3);

if (!scriptName) {
  console.error('Usage: node scripts/launch.js <script-name.ps1> [args...]');
  process.exit(1);
}

const scriptPath = path.resolve(__dirname, scriptName);

const ps = spawn(
  'powershell',
  ['-ExecutionPolicy', 'Bypass', '-File', scriptPath, ...args],
  {
    stdio: 'inherit',
    shell: false, // bypass cmd.exe entirely
  }
);

ps.on('exit', (code) => {
  process.exit(code ?? 0);
});
