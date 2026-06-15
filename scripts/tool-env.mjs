import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function candidatePnpmDirs() {
  const dirs = [];

  if (process.env.PNPM_HOME) {
    dirs.push(process.env.PNPM_HOME);
  }

  if (process.env.npm_execpath) {
    dirs.push(path.dirname(process.env.npm_execpath));
  }

  const runtimeBin = path.resolve(path.dirname(process.execPath), '..', '..', 'bin');
  dirs.push(runtimeBin);

  dirs.push(path.join(os.homedir(), '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'bin'));

  return [...new Set(dirs)].filter((dir) => {
    const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
    return fs.existsSync(path.join(dir, command));
  });
}

export function envWithPackageManagerPath(extra = {}) {
  const delimiter = process.platform === 'win32' ? ';' : ':';
  const dirs = candidatePnpmDirs();
  return {
    ...process.env,
    ...extra,
    PATH: [...dirs, process.env.PATH ?? ''].filter(Boolean).join(delimiter)
  };
}
