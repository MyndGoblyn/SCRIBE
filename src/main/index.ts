import path from 'node:path';
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { createDatabase, type ScribeDatabase } from './database';
import { configureAutoUpdates, registerUpdateIpc } from './updater';

let mainWindow: BrowserWindow | null = null;
let database: ScribeDatabase | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    title: 'SCRIBE',
    icon: resolveAppIcon(),
    backgroundColor: '#050b14',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

function resolveAppIcon(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'icon.ico')
    : path.join(__dirname, '../../build/icon.ico');
}

function getDatabase(): ScribeDatabase {
  if (!database) {
    throw new Error('Database is not initialized.');
  }
  return database;
}

function registerIpc(): void {
  ipcMain.handle('scribe:getAppData', () => getDatabase().getAppData());
  ipcMain.handle('scribe:createCharacter', (_event, input) => getDatabase().createCharacter(input));
  ipcMain.handle('scribe:updateCharacter', (_event, id, input) => getDatabase().updateCharacter(id, input));
  ipcMain.handle('scribe:createBuild', (_event, input) => getDatabase().createBuild(input));
  ipcMain.handle('scribe:updateBuild', (_event, id, input) => getDatabase().updateBuild(id, input));
  ipcMain.handle('scribe:upsertBuildLevel', (_event, input) => getDatabase().upsertBuildLevel(input));
  ipcMain.handle('scribe:createContentEntry', (_event, input) => getDatabase().createContentEntry(input));
  ipcMain.handle('scribe:createServerProfile', (_event, input) => getDatabase().createServerProfile(input));
  ipcMain.handle('scribe:createResourceLink', (_event, input) => getDatabase().createResourceLink(input));
  ipcMain.handle('scribe:buildMarkdown', (_event, buildId) => getDatabase().buildMarkdown(buildId));
  ipcMain.handle('scribe:saveBuildMarkdown', async (_event, buildId) => {
    const build = getDatabase().getAppData().builds.find((item) => item.id === buildId);
    const defaultPath = path.join(app.getPath('documents'), `${build?.name ?? 'scribe-build'}.md`);
    const options = {
      title: 'Export Markdown Build Guide',
      defaultPath,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    };
    const result = mainWindow ? await dialog.showSaveDialog(mainWindow, options) : await dialog.showSaveDialog(options);

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    return getDatabase().saveBuildMarkdown(buildId, result.filePath);
  });
}

app.whenReady().then(async () => {
  app.setName('SCRIBE');
  const dbPath = path.join(app.getPath('userData'), 'scribe.sqlite');
  database = createDatabase(dbPath);
  await database.init();
  registerIpc();
  registerUpdateIpc(() => mainWindow);
  createWindow();
  configureAutoUpdates(() => mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
