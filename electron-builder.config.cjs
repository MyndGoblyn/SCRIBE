const fs = require('node:fs');

const defaultOwner = 'MyndGoblyn';
const defaultRepo = 'SCRIBE';
const githubRepository = process.env.GITHUB_REPOSITORY;
const explicitOwner = process.env.GH_OWNER;
const explicitRepo = process.env.GH_REPO;

const [repoOwner, repoName] = githubRepository ? githubRepository.split('/') : [explicitOwner ?? defaultOwner, explicitRepo ?? defaultRepo];
const publish = repoOwner && repoName ? [{ provider: 'github', owner: repoOwner, repo: repoName }] : undefined;
const extraResources = [{ from: 'build/icon.ico', to: 'icon.ico' }];

if (fs.existsSync('wiki/nwnwiki.sqlite')) {
  extraResources.push({ from: 'wiki/nwnwiki.sqlite', to: 'wiki/nwnwiki.sqlite' });
}

/** @type {import('electron-builder').Configuration} */
const config = {
  appId: 'com.elryck.scribe',
  productName: 'SCRIBE',
  artifactName: 'SCRIBE-Setup-${version}-${arch}.${ext}',
  directories: {
    buildResources: 'build',
    output: 'dist'
  },
  files: ['out/**/*', 'package.json'],
  extraResources,
  asarUnpack: ['node_modules/sql.js/dist/sql-wasm.wasm'],
  win: {
    icon: 'build/icon.ico',
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      }
    ]
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'SCRIBE',
    uninstallDisplayName: 'SCRIBE',
    deleteAppDataOnUninstall: false
  }
};

if (publish) {
  config.publish = publish;
}

module.exports = config;
