import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { envWithPackageManagerPath } from './tool-env.mjs';

const repository = process.env.GITHUB_REPOSITORY || (process.env.GH_OWNER && process.env.GH_REPO ? `${process.env.GH_OWNER}/${process.env.GH_REPO}` : '');
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

if (!repository) {
  console.error('Missing GitHub repository. Set GITHUB_REPOSITORY=owner/repo or GH_OWNER and GH_REPO.');
  process.exit(1);
}

if (!token) {
  console.error('Missing GitHub token. Set GH_TOKEN or GITHUB_TOKEN before publishing a release.');
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    env: envWithPackageManagerPath({
      GITHUB_REPOSITORY: repository,
      GH_TOKEN: token
    })
  });

  if (result.error) {
    console.error(result.error.message);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runPackageManager(args) {
  if (process.env.npm_execpath) {
    run(process.execPath, [process.env.npm_execpath, ...args]);
    return;
  }

  run(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', args);
}

runPackageManager(['build']);
runPackageManager(['import:nwnwiki']);

const require = createRequire(import.meta.url);
run(process.execPath, [require.resolve('electron-builder/cli.js'), '--config', 'electron-builder.config.cjs', '--win', 'nsis', '--publish', 'onTagOrDraft']);
