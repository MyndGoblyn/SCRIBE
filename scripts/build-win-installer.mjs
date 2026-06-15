import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { envWithPackageManagerPath } from './tool-env.mjs';

const args = ['--config', 'electron-builder.config.cjs', '--win', 'nsis', ...process.argv.slice(2)];
const require = createRequire(import.meta.url);
const builderCli = require.resolve('electron-builder/cli.js');

const result = spawnSync(process.execPath, [builderCli, ...args], {
  stdio: 'inherit',
  shell: false,
  env: envWithPackageManagerPath()
});

if (result.error) {
  console.error(result.error.message);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
