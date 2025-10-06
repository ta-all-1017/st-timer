export interface ElectronAPI {
  onStateChange: (callback: (state: any) => void) => void
  onTimerUpdate: (callback: (data: any) => void) => void
  getProjects: () => Promise<any[]>
  createProject: (project: any) => Promise<void>
  updateProject: (id: string, updates: any) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  getCurrentProject: () => Promise<string | null>
  setCurrentProject: (projectId: string | null) => Promise<void>
  getSettings: () => Promise<any>
  updateSettings: (settings: any) => Promise<void>
  getStateImage: (state: string) => Promise<string>
  setStateImage: (state: string, path: string) => Promise<void>
  openImageDialog: () => Promise<string | null>
  getStatistics: (startDate: Date, endDate: Date) => Promise<any>
  toggleEating: () => Promise<void>
  getCurrentState: () => Promise<any>
  openDashboard: () => Promise<void>
  quit: () => Promise<void>
  testProgramChange: (programName: string) => Promise<void>
  forceStateChange: (state: string) => Promise<void>
  addCursorToProject: () => Promise<any>
}

declare global {
  interface Window {
    electron: ElectronAPI
  }
}

export {}