import { contextBridge, ipcRenderer } from 'electron';
import type {
  AppData,
  Build,
  BuildInput,
  BuildLevel,
  BuildLevelInput,
  Character,
  CharacterInput,
  ContentEntry,
  ContentEntryInput,
  ResourceLink,
  ResourceLinkInput,
  SaveMarkdownResult,
  ServerProfile,
  ServerProfileInput,
  UpdateStatus,
  WikiImportSummary,
  WikiPageDetail,
  WikiSearchResult
} from '../shared/contracts';

const api = {
  getAppData: (): Promise<AppData> => ipcRenderer.invoke('scribe:getAppData'),
  createCharacter: (input: CharacterInput): Promise<Character> => ipcRenderer.invoke('scribe:createCharacter', input),
  updateCharacter: (id: string, input: CharacterInput): Promise<Character> =>
    ipcRenderer.invoke('scribe:updateCharacter', id, input),
  createBuild: (input: BuildInput): Promise<Build> => ipcRenderer.invoke('scribe:createBuild', input),
  updateBuild: (id: string, input: BuildInput): Promise<Build> => ipcRenderer.invoke('scribe:updateBuild', id, input),
  upsertBuildLevel: (input: BuildLevelInput): Promise<BuildLevel> => ipcRenderer.invoke('scribe:upsertBuildLevel', input),
  createContentEntry: (input: ContentEntryInput): Promise<ContentEntry> =>
    ipcRenderer.invoke('scribe:createContentEntry', input),
  createServerProfile: (input: ServerProfileInput): Promise<ServerProfile> =>
    ipcRenderer.invoke('scribe:createServerProfile', input),
  createResourceLink: (input: ResourceLinkInput): Promise<ResourceLink> =>
    ipcRenderer.invoke('scribe:createResourceLink', input),
  buildMarkdown: (buildId: string): Promise<string> => ipcRenderer.invoke('scribe:buildMarkdown', buildId),
  saveBuildMarkdown: (buildId: string): Promise<SaveMarkdownResult> => ipcRenderer.invoke('scribe:saveBuildMarkdown', buildId),
  getNwnWikiSummary: (): Promise<WikiImportSummary> => ipcRenderer.invoke('scribe:getNwnWikiSummary'),
  searchNwnWiki: (query: string, limit?: number): Promise<WikiSearchResult[]> => ipcRenderer.invoke('scribe:searchNwnWiki', query, limit),
  getNwnWikiPage: (pageId: number): Promise<WikiPageDetail | null> => ipcRenderer.invoke('scribe:getNwnWikiPage', pageId),
  getUpdateStatus: (): Promise<UpdateStatus> => ipcRenderer.invoke('scribe:getUpdateStatus'),
  checkForUpdates: (): Promise<UpdateStatus> => ipcRenderer.invoke('scribe:checkForUpdates'),
  installUpdate: (): Promise<void> => ipcRenderer.invoke('scribe:installUpdate'),
  onUpdateStatus: (callback: (status: UpdateStatus) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: UpdateStatus): void => callback(status);
    ipcRenderer.on('scribe:updateStatus', listener);
    return () => ipcRenderer.removeListener('scribe:updateStatus', listener);
  }
};

contextBridge.exposeInMainWorld('scribe', api);

declare global {
  interface Window {
    scribe: typeof api;
  }
}
