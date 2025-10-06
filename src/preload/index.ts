import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  onStateChange: (callback: (state: any) => void) => {
    ipcRenderer.on('state-change', (_, state) => callback(state))
  },
  onTimerUpdate: (callback: (data: any) => void) => {
    ipcRenderer.on('timer-update', (_, data) => callback(data))
  },
  getProjects: () => ipcRenderer.invoke('get-projects'),
  createProject: (project: any) => ipcRenderer.invoke('create-project', project),
  updateProject: (id: string, updates: any) => ipcRenderer.invoke('update-project', id, updates),
  deleteProject: (id: string) => ipcRenderer.invoke('delete-project', id),
  getCurrentProject: () => ipcRenderer.invoke('get-current-project'),
  setCurrentProject: (projectId: string | null) => ipcRenderer.invoke('set-current-project', projectId),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings: any) => ipcRenderer.invoke('update-settings', settings),
  getStateImage: (state: string) => ipcRenderer.invoke('get-state-image', state),
  setStateImage: (state: string, path: string) => ipcRenderer.invoke('set-state-image', state, path),
  openImageDialog: () => ipcRenderer.invoke('open-image-dialog'),
  getStatistics: (startDate: Date, endDate: Date) => ipcRenderer.invoke('get-statistics', startDate, endDate),
  toggleEating: () => ipcRenderer.invoke('toggle-eating'),
  getCurrentState: () => ipcRenderer.invoke('get-current-state'),
  openDashboard: () => ipcRenderer.invoke('open-dashboard'),
  quit: () => ipcRenderer.invoke('quit-app'),
  testProgramChange: (programName: string) => ipcRenderer.invoke('test-program-change', programName),
  forceStateChange: (state: string) => ipcRenderer.invoke('force-state-change', state),
  addCursorToProject: () => ipcRenderer.invoke('add-cursor-to-project')
})