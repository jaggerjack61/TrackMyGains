const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const options = {
    pollIntervalMinutes: 5,
  };
  const aliases = {
    buildid: 'buildId',
    'build-id': 'buildId',
    outputpath: 'outputPath',
    'output-path': 'outputPath',
    pollintervalminutes: 'pollIntervalMinutes',
    'poll-interval-minutes': 'pollIntervalMinutes',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '-h' || argument === '--help') {
      options.help = true;
      continue;
    }

    const separator = argument.indexOf('=');
    const rawKey = (separator === -1 ? argument : argument.slice(0, separator)).replace(/^-+/, '').toLowerCase();
    const key = aliases[rawKey];
    if (!key) {
      throw new Error(`Unknown argument: ${argument}`);
    }

    const value = separator === -1 ? argv[index + 1] : argument.slice(separator + 1);
    if (!value || (separator === -1 && value.startsWith('-'))) {
      throw new Error(`Missing value for ${argument}`);
    }
    options[key] = value;
    if (separator === -1) {
      index += 1;
    }
  }

  options.pollIntervalMinutes = Number(options.pollIntervalMinutes);
  return options;
}

function defaultOutputPath() {
  const appJsonPath = path.join(repoRoot, 'app.json');
  const rawConfig = fs.readFileSync(appJsonPath, 'utf8').replace(/^\uFEFF/, '');
  const appConfig = JSON.parse(rawConfig);
  const versionDate = appConfig.expo?.extra?.apkVersionDate;
  if (!/^\d{8}$/.test(versionDate ?? '')) {
    throw new Error('app.json expo.extra.apkVersionDate must use YYYYMMDD format.');
  }
  return path.join(repoRoot, `TrackMyGains-preview-${versionDate}.apk`);
}

function queryBuild(buildId) {
  const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(executable, ['eas-cli', 'build:view', buildId, '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `EAS CLI exited with code ${result.status}.`).trim());
  }
  if (!result.stdout.trim()) {
    throw new Error('No output from EAS CLI.');
  }
  return JSON.parse(result.stdout);
}

async function download(url, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  process.stderr.write(`Downloading APK to ${destination} ...\n`);
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Download failed with HTTP ${response.status} ${response.statusText}.`);
  }

  const temporaryPath = `${destination}.download-${process.pid}`;
  try {
    await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(temporaryPath));
    fs.copyFileSync(temporaryPath, destination);
  } finally {
    fs.rmSync(temporaryPath, { force: true });
  }
  process.stderr.write(`Saved: ${destination}\n`);
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write('Usage: npm run download-apk -- --build-id <UUID> [--output-path <path>] [--poll-interval-minutes <minutes>]\n');
    return;
  }
  if (!options.buildId) {
    throw new Error('BuildId is required.');
  }
  if (!Number.isFinite(options.pollIntervalMinutes) || options.pollIntervalMinutes <= 0) {
    throw new Error('PollIntervalMinutes must be greater than zero.');
  }

  const outputPath = options.outputPath
    ? path.resolve(repoRoot, options.outputPath)
    : defaultOutputPath();
  process.stderr.write(`Polling EAS build ${options.buildId} every ${options.pollIntervalMinutes} minute(s)...\n`);
  process.stderr.write(`Output will be saved to: ${outputPath}\n`);

  const terminalStates = new Set(['ERRORED', 'CANCELED']);
  while (true) {
    let build;
    try {
      build = queryBuild(options.buildId);
    } catch (error) {
      process.stderr.write(`Failed to query build status: ${error instanceof Error ? error.message : String(error)}\n`);
      process.stderr.write(`Retrying in ${options.pollIntervalMinutes} minute(s)...\n`);
      await wait(options.pollIntervalMinutes * 60 * 1000);
      continue;
    }

    const status = String(build.status ?? '').toUpperCase();
    process.stderr.write(`[${new Date().toLocaleTimeString()}] Build status: ${status}\n`);
    if (status === 'FINISHED') {
      const url = build.artifacts?.buildUrl;
      if (!url) {
        throw new Error('Build finished but no artifact URL was found.');
      }
      await download(url, outputPath);
      process.stderr.write('Done.\n');
      return;
    }
    if (terminalStates.has(status)) {
      throw new Error(`Build ended with status '${status}'. No APK is available to download.`);
    }

    process.stderr.write(`Still in progress. Waiting ${options.pollIntervalMinutes} minute(s)...\n`);
    await wait(options.pollIntervalMinutes * 60 * 1000);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
