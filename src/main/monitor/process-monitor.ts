import { EventEmitter } from 'events'

let activeWin: any
try {
  const activeWinModule = require('active-win')
  console.log('active-win module loaded:', typeof activeWinModule)

  // The module has activeWindow method, not a direct function
  if (activeWinModule && activeWinModule.activeWindow) {
    activeWin = activeWinModule.activeWindow
    console.log('Using activeWindow method from active-win')
  } else if (activeWinModule && typeof activeWinModule === 'function') {
    activeWin = activeWinModule
    console.log('Using direct function from active-win')
  } else {
    console.error('active-win module structure unexpected:', activeWinModule)
    activeWin = null
  }
} catch (error) {
  console.error('Failed to load active-win:', error)
  activeWin = null
}

export interface ActiveProgram {
  name: string
  title: string
  bundleId?: string
}

export class ProcessMonitor extends EventEmitter {
  private intervalId: NodeJS.Timeout | null = null
  private currentProgram: ActiveProgram | null = null
  private isMonitoring: boolean = false

  async getCurrentActiveProgram(): Promise<ActiveProgram | null> {
    if (!activeWin || typeof activeWin !== 'function') {
      console.warn('active-win is not available, type:', typeof activeWin)
      return null
    }

    try {
      console.log('Calling active-win...')
      const window = await activeWin()
      console.log('active-win result:', window)

      if (window) {
        // Handle different possible response structures
        const program = {
          name: window.owner?.name || window.app || window.processName || window.title || 'Unknown',
          title: window.title || window.name || 'Unknown',
          bundleId: window.owner?.bundleId || window.bundleId
        }
        console.log('Extracted program info:', program)
        return program
      } else {
        console.log('active-win returned null/undefined')
      }
    } catch (error) {
      console.error('Error getting active window:', error)
    }
    return null
  }

  async checkProgramChange() {
    const activeProgram = await this.getCurrentActiveProgram()

    if (activeProgram) {
      if (!this.currentProgram ||
          this.currentProgram.name !== activeProgram.name ||
          this.currentProgram.title !== activeProgram.title) {

        console.log(`Program changed to: ${activeProgram.name} - ${activeProgram.title}`)

        this.currentProgram = activeProgram
        this.emit('program-change', activeProgram)
      }
    }
  }

  start() {
    if (this.isMonitoring) {
      console.log('Process monitor is already running')
      return
    }

    console.log('Starting process monitor...')
    this.isMonitoring = true

    this.checkProgramChange()

    this.intervalId = setInterval(() => {
      this.checkProgramChange()
    }, 500)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isMonitoring = false
    this.currentProgram = null
    console.log('Process monitor stopped')
  }

  getCurrentProgram(): ActiveProgram | null {
    return this.currentProgram
  }

  isRunning(): boolean {
    return this.isMonitoring
  }
}