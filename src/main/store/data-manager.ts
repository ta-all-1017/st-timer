import Store from 'electron-store'
import { WorkState } from '../monitor/state-manager'
import { randomBytes } from 'crypto'

export interface Project {
  id: string
  name: string
  color: string
  programs: string[]
  dailyGoal: number
  createdAt: Date
}

export interface WorkLog {
  id: string
  projectId: string | null
  state: WorkState
  programName: string | null
  startTime: Date
  endTime: Date | null
  duration: number
}

export interface Settings {
  restingThreshold: number
  sleepingThreshold: number
  overlayTransparency: number
  overlaySize: number
  textSize: number
  autoStart: boolean
  notifications: {
    stateChange: boolean
    goalAchieved: boolean
    longDistraction: boolean
  }
}

export interface StoreSchema {
  projects: Project[]
  workLogs: WorkLog[]
  settings: Settings
  stateImages: {
    [key in WorkState]?: string
  }
  currentProject: string | null
}

class DataManager {
  private static instance: DataManager
  private store: Store<StoreSchema>

  private constructor() {
    this.store = new Store<StoreSchema>({
      name: 'work-timer-data',
      defaults: {
        projects: [],
        workLogs: [],
        settings: {
          restingThreshold: 300,
          sleepingThreshold: 1800,
          overlayTransparency: 90,
          overlaySize: 100,
          textSize: 14,
          autoStart: false,
          notifications: {
            stateChange: true,
            goalAchieved: true,
            longDistraction: true
          }
        },
        stateImages: {},
        currentProject: null
      }
    })

    this.cleanOldLogs()
  }

  static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager()
    }
    return DataManager.instance
  }

  private cleanOldLogs() {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const logs = (this.store as any).get('workLogs')
    const filteredLogs = logs.filter((log: any) => new Date(log.startTime) > thirtyDaysAgo)

    if (filteredLogs.length < logs.length) {
      (this.store as any).set('workLogs', filteredLogs)
      console.log(`Cleaned ${logs.length - filteredLogs.length} old logs`)
    }
  }

  getProjects(): Project[] {
    return (this.store as any).get('projects').map((p: any) => ({
      ...p,
      createdAt: new Date(p.createdAt)
    }))
  }

  addProject(project: Omit<Project, 'id' | 'createdAt'>): Project {
    const newProject: Project = {
      ...project,
      id: randomBytes(16).toString('hex'),
      createdAt: new Date()
    }

    const projects = (this.store as any).get('projects')
    projects.push(newProject)
    ;(this.store as any).set('projects', projects)

    console.log(`Project added: ${newProject.name}`)
    return newProject
  }

  updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): boolean {
    const projects = (this.store as any).get('projects')
    const index = projects.findIndex((p: any) => p.id === id)

    if (index === -1) {
      console.error(`Project not found: ${id}`)
      return false
    }

    projects[index] = { ...projects[index], ...updates }
    ;(this.store as any).set('projects', projects)

    console.log(`Project updated: ${id}`)
    return true
  }

  deleteProject(id: string): boolean {
    const projects = (this.store as any).get('projects')
    const filteredProjects = projects.filter((p: any) => p.id !== id)

    if (filteredProjects.length === projects.length) {
      console.error(`Project not found: ${id}`)
      return false
    }

    ;(this.store as any).set('projects', filteredProjects)

    const logs = (this.store as any).get('workLogs')
    const filteredLogs = logs.filter((log: any) => log.projectId !== id)
    ;(this.store as any).set('workLogs', filteredLogs)

    console.log(`Project deleted: ${id}`)
    return true
  }

  addWorkLog(log: Omit<WorkLog, 'id'>): WorkLog {
    const newLog: WorkLog = {
      ...log,
      id: randomBytes(16).toString('hex'),
      startTime: new Date(log.startTime),
      endTime: log.endTime ? new Date(log.endTime) : null
    }

    const logs = (this.store as any).get('workLogs')
    logs.push(newLog)
    ;(this.store as any).set('workLogs', logs)

    console.log(`Work log added: ${newLog.state} - ${newLog.duration}s`)
    return newLog
  }

  getWorkLogs(startDate?: Date, endDate?: Date): WorkLog[] {
    let logs = (this.store as any).get('workLogs').map((log: any) => ({
      ...log,
      startTime: new Date(log.startTime),
      endTime: log.endTime ? new Date(log.endTime) : null
    }))

    if (startDate) {
      logs = logs.filter((log: any) => log.startTime >= startDate)
    }

    if (endDate) {
      logs = logs.filter((log: any) => log.startTime <= endDate)
    }

    return logs
  }

  getTodayWorkLogs(): WorkLog[] {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return this.getWorkLogs(today)
  }

  getSettings(): Settings {
    return (this.store as any).get('settings')
  }

  updateSettings(updates: Partial<Settings>): void {
    const currentSettings = (this.store as any).get('settings')

    const newSettings = {
      ...currentSettings,
      ...updates
    }

    // Handle nested notifications object properly
    if (updates.notifications) {
      newSettings.notifications = {
        ...currentSettings.notifications,
        ...updates.notifications
      }
    }

    ;(this.store as any).set('settings', newSettings)
    console.log('Settings updated:', newSettings)
  }

  getStateImage(state: WorkState): string | null {
    const images = (this.store as any).get('stateImages')
    return images[state] || null
  }

  setStateImage(state: WorkState, path: string): void {
    const images = (this.store as any).get('stateImages')
    if (path === '') {
      delete images[state]
    } else {
      images[state] = path
    }
    ;(this.store as any).set('stateImages', images)
    console.log(`State image set for ${state}: ${path || 'default'}`)
  }

  getCurrentProject(): string | null {
    return (this.store as any).get('currentProject')
  }

  setCurrentProject(projectId: string | null): void {
    ;(this.store as any).set('currentProject', projectId)
    console.log(`Current project set to: ${projectId}`)
  }

  getStatistics(startDate: Date, endDate: Date): any {
    const logs = this.getWorkLogs(startDate, endDate)

    const totalWorkTime = logs
      .filter(log => log.state === WorkState.WORKING)
      .reduce((sum, log) => sum + log.duration, 0)

    const totalDistractedTime = logs
      .filter(log => log.state === WorkState.DISTRACTED)
      .reduce((sum, log) => sum + log.duration, 0)

    const totalRestTime = logs
      .filter(log => log.state === WorkState.RESTING)
      .reduce((sum, log) => sum + log.duration, 0)

    const projectTimes: { [key: string]: number } = {}
    logs.forEach(log => {
      if (log.projectId && log.state === WorkState.WORKING) {
        projectTimes[log.projectId] = (projectTimes[log.projectId] || 0) + log.duration
      }
    })

    return {
      totalWorkTime,
      totalDistractedTime,
      totalRestTime,
      totalTime: totalWorkTime + totalDistractedTime + totalRestTime,
      projectTimes,
      logs
    }
  }
}

export default DataManager