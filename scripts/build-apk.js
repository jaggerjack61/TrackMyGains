const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function parseArgs(argv) {
  const options = {
    profile: 'preview',
    platform: 'android',
    versionDate: formatLocalDate(new Date()),
  };
  const aliases = {
    profile: 'profile',
    platform: 'platform',
    versiondate: 'versionDate',
    'version-date': 'versionDate',
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

  return options;
}

function updateVersionDate(versionDate) {
  const appJsonPath = path.join(repoRoot, 'app.json');
  const rawConfig = fs.readFileSync(appJsonPath, 'utf8').replace(/^\uFEFF/, '');
  const appConfig = JSON.parse(rawConfig);

  if (!appConfig.expo) {
    throw new Error('app.json must contain an expo configuration.');
  }

  appConfig.expo.extra ??= {};
  appConfig.expo.extra.apkVersionDate = versionDate;
  fs.writeFileSync(appJsonPath, `${JSON.stringify(appConfig, null, 2)}\n`, 'utf8');
}

function easEnvironment() {
  const environment = { ...process.env };
  if (process.allowedNodeEnvironmentFlags.has('--use-env-proxy')) {
    const nodeOptions = environment.NODE_OPTIONS ?? '';
    if (!nodeOptions.includes('--use-env-proxy')) {
      environment.NODE_OPTIONS = `${nodeOptions} --use-env-proxy`.trim();
    }
  }
  return environment;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write('Usage: npm run build-apk -- [--profile <name>] [--platform <name>] [--version-date <YYYYMMDD>]\n');
    return;
  }
  if (!/^\d{8}$/.test(options.versionDate)) {
    throw new Error('VersionDate must use YYYYMMDD format.');
  }

  updateVersionDate(options.versionDate);
  process.stderr.write(`Starting EAS build (profile: ${options.profile}, platform: ${options.platform}, version date: ${options.versionDate})...\n`);

  const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(
    executable,
    ['eas-cli', 'build', '--platform', options.platform, '--profile', options.profile, '--non-interactive', '--no-wait'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: easEnvironment(),
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  if (result.error) {
    throw result.error;
  }

  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  if (result.status !== 0) {
    process.stderr.write(output);
    throw new Error(`EAS CLI exited with code ${result.status}.`);
  }

  const uuid = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
  const urlMatch = output.match(new RegExp(`https://expo\\.dev/\\S*/builds/(${uuid})`, 'i'));
  const matches = [...output.matchAll(new RegExp(`\\b(${uuid})\\b`, 'gi'))];
  const buildId = urlMatch?.[1] ?? matches.at(-1)?.[1];

  if (!buildId) {
    process.stderr.write(`EAS CLI output:\n${output}`);
    throw new Error('Could not extract build ID from EAS build output.');
  }

  process.stdout.write(`${buildId}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
