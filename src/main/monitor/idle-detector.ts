import { EventEmitter } from 'events'
import { powerMonitor } from 'electron'

export type IdleState = 'active' | 'idle-resting' | 'idle-sleeping'

export interface IdleConfig {
  restingThreshold: number
  sleepingThreshold: number
}

export class IdleDetector extends EventEmitter {
  private config: IdleConfig
  private checkInterval: NodeJS.Timeout | null = null
  private lastActiveTime: Date
  private currentState: IdleState = 'active'
  private isMonitoring: boolean = false

  constructor(config?: Partial<IdleConfig>) {
    super()
    this.config = {
      restingThreshold: 5 * 60,
      sleepingThreshold: 30 * 60,
      ...config
    }
    this.lastActiveTime = new Date()
  }

  private getIdleTime(): number {
    return powerMonitor.getSystemIdleTime()
  }

  private checkIdleState() {
    const idleTime = this.getIdleTime()
    const previousState = this.currentState
    let newState: IdleState = 'active'

    if (idleTime >= this.config.sleepingThreshold) {
      newState = 'idle-sleeping'
    } else if (idleTime >= this.config.restingThreshold) {
      newState = 'idle-resting'
    } else {
      newState = 'active'
    }

    if (newState !== previousState) {
      this.currentState = newState
      console.log(`Idle state changed: ${previousState} -> ${newState} (idle: ${idleTime}s)`)

      if (newState === 'idle-resting') {
        this.emit('idle-resting')
      } else if (newState === 'idle-sleeping') {
        this.emit('idle-sleeping')
      } else if (newState === 'active' && previousState !== 'active') {
        this.lastActiveTime = new Date()
        this.emit('idle-resume')
      }
    }
  }

  start() {
    if (this.isMonitoring) {
      console.log('Idle detector is already running')
      return
    }

    console.log('Starting idle detector...')
    console.log(`Resting threshold: ${this.config.restingThreshold}s`)
    console.log(`Sleeping threshold: ${this.config.sleepingThreshold}s`)

    this.isMonitoring = true
    this.lastActiveTime = new Date()
    this.currentState = 'active'

    this.checkInterval = setInterval(() => {
      this.checkIdleState()
    }, 10000) // Check every 10 seconds for faster response

    this.checkIdleState()

    powerMonitor.on('resume', () => {
      console.log('System resumed from suspend')
      this.lastActiveTime = new Date()
      this.currentState = 'active'
      this.emit('idle-resume')
    })

    powerMonitor.on('suspend', () => {
      console.log('System is going to suspend')
      this.currentState = 'idle-sleeping'
      this.emit('idle-sleeping')
    })
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    this.isMonitoring = false
    console.log('Idle detector stopped')
  }

  updateConfig(config: Partial<IdleConfig>) {
    this.config = { ...this.config, ...config }
    console.log('Idle detector config updated:', this.config)
  }

  getConfig(): IdleConfig {
    return { ...this.config }
  }

  getCurrentState(): IdleState {
    return this.currentState
  }

  getLastActiveTime(): Date {
    return new Date(this.lastActiveTime)
  }

  isRunning(): boolean {
    return this.isMonitoring
  }
}