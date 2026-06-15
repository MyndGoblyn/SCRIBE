import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const transientTargets = ['tmp'];

for (const target of transientTargets) {
  const absolute = path.join(root, target);
  if (fs.existsSync(absolute)) {
    fs.rmSync(absolute, { recursive: true, force: true });
    console.log(`Removed ${target}`);
  }
}

console.log('Workspace cleanup complete.');
