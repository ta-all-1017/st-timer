import { app, BrowserWindow, screen, ipcMain, dialog } from 'electron'
import * as path from 'path'
import { TrayManager } from './tray-manager'
import { ProcessMonitor } from './monitor/process-monitor'
import { IdleDetector } from './monitor/idle-detector'
import { StateManager } from './monitor/state-manager'
import DataManager from './store/data-manager'
import { setupDebugHandlers } from './debug-helper'

const isDev = process.argv.includes('--dev')

let mainWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null
let trayManager: TrayManager | null = null
let processMonitor: ProcessMonitor | null = null
let idleDetector: IdleDetector | null = null
let stateManager: StateManager | null = null

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: '으랏차차 작업레츠기릿',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow loading local files
      preload: path.join(__dirname, '../preload/index.js')
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5174/dashboard/')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/dashboard/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createOverlayWindow() {
  console.log('🖼️ Creating overlay window...')
  
  const dataManager = DataManager.getInstance()
  const settings = dataManager.getSettings()
  
  // 설정에 따른 실제 크기 계산 (1:1 비율)
  const baseSize = 213  // 정사각형 기본 크기
  const scaleFactor = (settings.overlaySize || 100) / 100
  const actualSize = Math.round(baseSize * scaleFactor)

  overlayWindow = new BrowserWindow({
    width: actualSize,
    height: actualSize,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    show: false, // Don't show initially
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow loading local files
      preload: path.join(__dirname, '../preload/index.js')
    }
  })

  console.log('🖼️ Overlay window created, loading content...')

  if (isDev) {
    overlayWindow.loadURL('http://localhost:5174/overlay/')
    // Don't open DevTools for overlay
  } else {
    overlayWindow.loadFile(path.join(__dirname, '../renderer/overlay/index.html'))
  }

  overlayWindow.setIgnoreMouseEvents(false)

  const display = screen.getPrimaryDisplay()
  const { width } = display.workAreaSize

  console.log('🖼️ Display info:', { width, workAreaSize: display.workAreaSize })

  const overlayX = width - actualSize - 20
  const overlayY = 20

  overlayWindow.setBounds({
    x: overlayX,
    y: overlayY,
    width: actualSize,
    height: actualSize
  })

  console.log('🖼️ Overlay positioned at:', { x: overlayX, y: overlayY })

  // Show the overlay after content is loaded
  overlayWindow.once('ready-to-show', () => {
    console.log('🖼️ Overlay ready to show, making visible...')
    overlayWindow?.show()
    console.log('🖼️ Overlay window should now be visible!')
  })

  overlayWindow.on('closed', () => {
    console.log('🖼️ Overlay window closed')
    overlayWindow = null
  })
}

function setupIpcHandlers() {
  const dataManager = DataManager.getInstance()

  // Projects
  ipcMain.handle('get-projects', () => {
    return dataManager.getProjects()
  })

  ipcMain.handle('create-project', (_, project) => {
    return dataManager.addProject(project)
  })

  ipcMain.handle('update-project', (_, id, updates) => {
    return dataManager.updateProject(id, updates)
  })

  ipcMain.handle('delete-project', (_, id) => {
    return dataManager.deleteProject(id)
  })

  ipcMain.handle('get-current-project', () => {
    return dataManager.getCurrentProject()
  })

  ipcMain.handle('set-current-project', (_, projectId) => {
    dataManager.setCurrentProject(projectId)
    if (stateManager) {
      stateManager.setCurrentProject(projectId)
    }
  })

  // Settings
  ipcMain.handle('get-settings', () => {
    return dataManager.getSettings()
  })

  ipcMain.handle('update-settings', (_, settings) => {
    console.log('📝 Updating settings:', settings)
    dataManager.updateSettings(settings)

    if (idleDetector && (settings.restingThreshold || settings.sleepingThreshold)) {
      console.log('⏱️ Updating idle detector config:', {
        restingThreshold: settings.restingThreshold,
        sleepingThreshold: settings.sleepingThreshold
      })
      idleDetector.updateConfig({
        restingThreshold: settings.restingThreshold,
        sleepingThreshold: settings.sleepingThreshold
      })
    }

    // 오버레이 설정 적용
    if (overlayWindow && (settings.overlaySize || settings.overlayTransparency || settings.textSize)) {
      updateOverlaySettings(settings)
    }

    return { success: true }
  })

  // State Images
  ipcMain.handle('get-state-image', (_, state) => {
    return dataManager.getStateImage(state)
  })

  ipcMain.handle('set-state-image', (_, state, path) => {
    dataManager.setStateImage(state, path)
  })

  ipcMain.handle('open-image-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: '이미지 선택',
      filters: [
        { name: '이미지 파일', extensions: ['png', 'gif', 'webp', 'jpg', 'jpeg'] }
      ],
      properties: ['openFile']
    })

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]
    }
    return null
  })

  // Statistics
  ipcMain.handle('get-statistics', (_, startDate, endDate) => {
    return dataManager.getStatistics(new Date(startDate), new Date(endDate))
  })

  // State Management
  ipcMain.handle('toggle-eating', () => {
    if (stateManager) {
      stateManager.toggleEating()
    }
  })

  ipcMain.handle('get-current-state', () => {
    try {
      const state = stateManager ? stateManager.getCurrentState() : null
      console.log('IPC get-current-state returning:', state)
      return state
    } catch (error) {
      console.error('Error getting current state:', error)
      return null
    }
  })

  // Window Management
  ipcMain.handle('open-dashboard', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  ipcMain.handle('quit-app', () => {
    app.quit()
  })

  // 테스트용 수동 프로그램 변경
  ipcMain.handle('test-program-change', (_, programName) => {
    if (stateManager) {
      console.log(`Manual program change test: ${programName}`)
      stateManager.onProgramChange({ name: programName, title: programName })
    }
  })

  // 강제 상태 변경
  ipcMain.handle('force-state-change', (_, state) => {
    if (stateManager) {
      console.log(`Force state change to: ${state}`)
      const currentProject = dataManager.getCurrentProject()
      stateManager.setState(state, currentProject || undefined)
    }
  })

  // 임시: 현재 프로젝트에 Cursor 프로그램 추가
  ipcMain.handle('add-cursor-to-project', () => {
    const currentProjectId = dataManager.getCurrentProject()
    if (currentProjectId) {
      const projects = dataManager.getProjects()
      const currentProject = projects.find(p => p.id === currentProjectId)
      if (currentProject && !currentProject.programs.includes('Cursor')) {
        const updatedPrograms = [...currentProject.programs, 'Cursor']
        dataManager.updateProject(currentProjectId, { programs: updatedPrograms })
        console.log('Added Cursor to current project')
        return { success: true, message: 'Cursor added to current project' }
      } else {
        return { success: false, message: 'Cursor already in project or project not found' }
      }
    } else {
      return { success: false, message: 'No current project set' }
    }
  })

  // 디버깅: 현재 프로그램 상태 출력
  ipcMain.handle('debug-current-status', () => {
    const currentProjectId = dataManager.getCurrentProject()
    const projects = dataManager.getProjects()
    const currentProject = projects.find(p => p.id === currentProjectId)
    const currentState = stateManager ? stateManager.getCurrentState() : null
    
    console.log('\n🔍 === DEBUG CURRENT STATUS ===')
    console.log('📂 Current Project ID:', currentProjectId)
    console.log('📋 Current Project:', currentProject ? {
      name: currentProject.name,
      programs: currentProject.programs
    } : 'None')
    console.log('🔖 Current State:', currentState)
    console.log('🖥️ Current Program from StateManager:', currentState?.programName)
    
    if (processMonitor) {
      const currentProgram = processMonitor.getCurrentProgram()
      console.log('🖥️ Current Program from Monitor:', currentProgram)
    }
    
    return {
      currentProjectId,
      currentProject: currentProject ? {
        name: currentProject.name,
        programs: currentProject.programs
      } : null,
      currentState,
      currentProgram: processMonitor ? processMonitor.getCurrentProgram() : null
    }
  })
}

function updateOverlaySettings(settings: any) {
  if (!overlayWindow) return
  
  const baseSize = 213  // 정사각형 기본 크기
  const scaleFactor = (settings.overlaySize || 100) / 100
  const actualSize = Math.round(baseSize * scaleFactor)
  
  // 윈도우 크기 및 위치 업데이트
  const display = screen.getPrimaryDisplay()
  const { width } = display.workAreaSize
  const overlayX = width - actualSize - 20
  const overlayY = 20
  
  overlayWindow.setBounds({
    x: overlayX,
    y: overlayY,
    width: actualSize,
    height: actualSize
  })
  
  // 오버레이에 설정 전송
  overlayWindow.webContents.send('overlay-settings-update', {
    textSize: settings.textSize,
    transparency: settings.overlayTransparency,
    size: settings.overlaySize
  })
  
  console.log('🖼️ Overlay settings updated:', {
    windowSize: `${actualSize}x${actualSize}`,
    textSize: settings.textSize,
    transparency: settings.overlayTransparency,
    size: settings.overlaySize
  })
}

app.whenReady().then(() => {
  createMainWindow()
  createOverlayWindow()

  if (mainWindow && overlayWindow) {
    trayManager = new TrayManager(mainWindow, overlayWindow)
    trayManager.createTray()
  }

  stateManager = new StateManager()

  processMonitor = new ProcessMonitor()
  processMonitor.start()

  processMonitor.on('program-change', (program) => {
    console.log('Active program changed:', program)
    if (stateManager) {
      stateManager.onProgramChange(program)
    }
  })

  idleDetector = new IdleDetector()
  idleDetector.start()

  idleDetector.on('idle-resting', () => {
    console.log('User is resting (5 minutes idle)')
    if (stateManager) {
      stateManager.onIdleDetected('idle-resting')
    }
  })

  idleDetector.on('idle-sleeping', () => {
    console.log('User is sleeping (30 minutes idle)')
    if (stateManager) {
      stateManager.onIdleDetected('idle-sleeping')
    }
  })

  idleDetector.on('idle-resume', () => {
    console.log('User resumed activity')
    if (stateManager) {
      stateManager.onIdleDetected('idle-resume')
    }
  })

  stateManager.on('state-changed', (state) => {
    console.log('State changed:', state)
    // Broadcast state change to all windows
    if (mainWindow) {
      mainWindow.webContents.send('state-change', state)
    }
    if (overlayWindow) {
      overlayWindow.webContents.send('state-change', state)
    }
    // Update tray icon
    if (trayManager) {
      trayManager.updateTrayIcon(state.state)
    }
  })

  // Send timer updates every second
  setInterval(() => {
    try {
      if (stateManager) {
        const currentState = stateManager.getCurrentState()
        if (currentState) {
          const timerData = {
            ...currentState,
            sessionDuration: stateManager.getSessionDuration()
          }

          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('timer-update', timerData)
          }
          if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.webContents.send('timer-update', timerData)
          }
        }
      }
    } catch (error) {
      console.error('Error in timer update:', error)
    }
  }, 1000)

  setupIpcHandlers()
  setupDebugHandlers()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
      createOverlayWindow()
      if (mainWindow && overlayWindow) {
        trayManager = new TrayManager(mainWindow, overlayWindow)
        trayManager.createTray()
      }
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (trayManager) {
      trayManager.destroy()
    }
    if (processMonitor) {
      processMonitor.stop()
    }
    if (idleDetector) {
      idleDetector.stop()
    }
    if (stateManager) {
      stateManager.saveCurrentSession()
      stateManager.removeAllListeners()
    }
    app.quit()
  }
})