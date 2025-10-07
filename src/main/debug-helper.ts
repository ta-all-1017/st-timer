import { ipcMain } from 'electron'
import DataManager from './store/data-manager'

export function setupDebugHandlers() {
  // 디버그 정보를 가져오는 핸들러
  ipcMain.handle('debug-get-info', () => {
    const dataManager = DataManager.getInstance()
    const projects = dataManager.getProjects()
    const currentProjectId = dataManager.getCurrentProject()
    const currentProject = projects.find(p => p.id === currentProjectId)
    
    return {
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        programs: p.programs
      })),
      currentProjectId,
      currentProject: currentProject ? {
        name: currentProject.name,
        programs: currentProject.programs
      } : null
    }
  })

  // 현재 활성 프로그램 확인 핸들러
  ipcMain.handle('debug-get-current-program', async () => {
    try {
      const { ProcessMonitor } = require('./monitor/process-monitor')
      const monitor = new ProcessMonitor()
      const currentProgram = await monitor.getCurrentActiveProgram()
      
      console.log('🔍 Manual program check requested')
      console.log(`🖥️ Current Active Program: "${currentProgram?.name || 'none'}" | Title: "${currentProgram?.title || 'none'}"`)
      
      return currentProgram
    } catch (error) {
      console.error('Error getting current program:', error)
      return null
    }
  })
  
  console.log('Debug handlers set up')
}