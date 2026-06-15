import { app, BrowserWindow, ipcMain } from 'electron';
import log from 'electron-log/main';
import electronUpdater, { type AppUpdater } from 'electron-updater';
import type { UpdateStatus } from '../shared/contracts';

const { autoUpdater } = electronUpdater;

let updateStatus: UpdateStatus = {
  state: 'idle',
  message: 'Update service is waiting to start.',
  updatedAt: new Date().toISOString()
};

function getUpdater(): AppUpdater {
  return autoUpdater;
}

function publishStatus(next: Omit<UpdateStatus, 'updatedAt'>, getWindow: () => BrowserWindow | null): UpdateStatus {
  updateStatus = {
    ...next,
    updatedAt: new Date().toISOString()
  };

  getWindow()?.webContents.send('scribe:updateStatus', updateStatus);
  return updateStatus;
}

export function registerUpdateIpc(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('scribe:getUpdateStatus', () => updateStatus);
  ipcMain.handle('scribe:checkForUpdates', async () => {
    if (!app.isPackaged) {
      return publishStatus(
        {
          state: 'disabled',
          message: 'Update checks run in packaged installer builds.'
        },
        getWindow
      );
    }

    publishStatus({ state: 'checking', message: 'Checking for SCRIBE updates...' }, getWindow);
    await getUpdater().checkForUpdates();
    return updateStatus;
  });

  ipcMain.handle('scribe:installUpdate', () => {
    if (updateStatus.state === 'downloaded') {
      getUpdater().quitAndInstall(false, true);
    }
  });
}

export function configureAutoUpdates(getWindow: () => BrowserWindow | null): void {
  log.initialize();
  log.transports.file.level = 'info';

  const updater = getUpdater();
  updater.logger = log;
  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;

  if (!app.isPackaged) {
    publishStatus(
      {
        state: 'disabled',
        message: 'Update checks run in packaged installer builds.'
      },
      getWindow
    );
    return;
  }

  updater.on('checking-for-update', () => {
    publishStatus({ state: 'checking', message: 'Checking for SCRIBE updates...' }, getWindow);
  });

  updater.on('update-available', (info) => {
    publishStatus(
      {
        state: 'available',
        message: `Version ${info.version} is available. Downloading now...`,
        version: info.version
      },
      getWindow
    );
  });

  updater.on('update-not-available', (info) => {
    publishStatus(
      {
        state: 'not_available',
        message: `SCRIBE is current at version ${info.version}.`,
        version: info.version
      },
      getWindow
    );
  });

  updater.on('download-progress', (progress) => {
    publishStatus(
      {
        state: 'downloading',
        message: `Downloading update: ${Math.round(progress.percent)}%`,
        percent: progress.percent
      },
      getWindow
    );
  });

  updater.on('update-downloaded', (info) => {
    publishStatus(
      {
        state: 'downloaded',
        message: `Version ${info.version} is ready. It will install when SCRIBE restarts.`,
        version: info.version
      },
      getWindow
    );
  });

  updater.on('error', (error) => {
    publishStatus(
      {
        state: 'error',
        message: error instanceof Error ? error.message : String(error)
      },
      getWindow
    );
  });

  setTimeout(() => {
    void updater.checkForUpdatesAndNotify().catch((error) => {
      publishStatus(
        {
          state: 'error',
          message: error instanceof Error ? error.message : String(error)
        },
        getWindow
      );
    });
  }, 7000);
}
