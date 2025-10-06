import { EventEmitter } from 'events'
import { ActiveProgram } from './process-monitor'
import DataManager from '../store/data-manager'

export enum WorkState {
  WORKING = 'working',
  DISTRACTED = 'distracted',
  RESTING = 'resting',
  EATING = 'eating',
  SLEEPING = 'sleeping'
}

export interface StateInfo {
  state: WorkState
  projectId: string | null
  programName: string | null
  sessionStartTime: Date
  previousState: WorkState | null
}

export interface ProgramCategory {
  name: string
  programs: string[]
  state: WorkState
}

const DEFAULT_WORK_PROGRAMS = [
  'Visual Studio Code',
  'WebStorm',
  'IntelliJ IDEA',
  'Android Studio',
  'Xcode',
  'Sublime Text',
  'Atom',
  'Terminal',
  'cmd',
  'PowerShell',
  'iTerm2',
  'Hyper',
  'Postman',
  'Docker Desktop',
  'Microsoft Word',
  'Microsoft Excel',
  'Microsoft PowerPoint',
  'Google Chrome',
  'Microsoft Edge',
  'Safari',
  'Firefox'
]

export class StateManager extends EventEmitter {
  private currentState: WorkState = WorkState.RESTING
  private currentProject: string | null = null
  private sessionStartTime: Date = new Date()
  private previousState: WorkState | null = null
  private currentProgram: string | null = null
  private dataManager: DataManager

  constructor() {
    super()
    this.dataManager = DataManager.getInstance()
    this.currentProject = this.dataManager.getCurrentProject()
    console.log('StateManager initialized')
  }

  setCurrentProject(projectId: string | null) {
    this.currentProject = projectId
  }

  private isWorkProgram(programName: string): boolean {
    return DEFAULT_WORK_PROGRAMS.some(work =>
      programName.toLowerCase().includes(work.toLowerCase())
    )
  }

  private isProjectProgram(programName: string): boolean {
    if (!this.currentProject) {
      return false
    }

    const projects = this.dataManager.getProjects()
    const project = projects.find(p => p.id === this.currentProject)

    if (!project || !project.programs || project.programs.length === 0) {
      return false
    }

    const isMatch = project.programs.some(prog => {
      const programLower = programName.toLowerCase()
      const progLower = prog.toLowerCase()
      return programLower.includes(progLower) || progLower.includes(programLower)
    })

    return isMatch
  }

  setState(state: WorkState, projectId?: string) {
    if (this.currentState === state && this.currentProject === projectId) {
      return
    }

    const now = new Date()
    const sessionDuration = Math.floor((now.getTime() - this.sessionStartTime.getTime()) / 1000)

    if (sessionDuration > 5) {
      this.dataManager.addWorkLog({
        projectId: this.currentProject,
        state: this.currentState,
        programName: this.currentProgram,
        startTime: this.sessionStartTime,
        endTime: now,
        duration: sessionDuration
      })
    }

    this.previousState = this.currentState
    this.currentState = state

    if (projectId !== undefined) {
      this.currentProject = projectId
    }

    this.sessionStartTime = now

    this.emit('state-changed', this.getCurrentState())
  }

  onProgramChange(program: ActiveProgram) {
    this.currentProgram = program.name

    // 식사 중이거나 수면 중이면 프로그램 변경 무시
    if (this.currentState === WorkState.EATING || this.currentState === WorkState.SLEEPING) {
      return
    }

    // 휴식 중이었다면 활동 재개 (프로그램을 사용하기 시작함)
    // 이 경우 아래 로직으로 상태를 결정

    // 프로젝트가 선택되어 있는 경우
    if (this.currentProject) {
      const isProjectProg = this.isProjectProgram(program.name)

      if (isProjectProg) {
        // 프로젝트 프로그램 사용 -> 작업 중
        if (this.currentState !== WorkState.WORKING) {
          this.setState(WorkState.WORKING, this.currentProject)
        }
      } else {
        // 프로젝트가 아닌 다른 프로그램 사용 -> 딴짓 중
        if (this.currentState !== WorkState.DISTRACTED) {
          this.setState(WorkState.DISTRACTED)
        }
      }
    } else {
      // 프로젝트가 선택되지 않은 경우: 기본 작업 프로그램 사용 -> 작업 중, 나머지 -> 딴짓 중
      if (this.isWorkProgram(program.name)) {
        if (this.currentState !== WorkState.WORKING) {
          this.setState(WorkState.WORKING)
        }
      } else {
        // 기본 작업 프로그램이 아닌 모든 프로그램 -> 딴짓 중
        if (this.currentState !== WorkState.DISTRACTED) {
          this.setState(WorkState.DISTRACTED)
        }
      }
    }
  }

  onIdleDetected(type: 'idle-resting' | 'idle-sleeping' | 'idle-resume') {
    switch (type) {
      case 'idle-resting':
        // 식사 중이 아니면 휴식 상태로 전환
        if (this.currentState !== WorkState.EATING) {
          this.setState(WorkState.RESTING)
        }
        break

      case 'idle-sleeping':
        // 식사 중이었다면 기록해두고, 수면 상태로 전환
        if (this.currentState === WorkState.EATING) {
          this.previousState = WorkState.EATING
        }
        this.setState(WorkState.SLEEPING)
        break

      case 'idle-resume':
        // 활동 재개 시 상태 복원
        if (this.currentState === WorkState.SLEEPING && this.previousState === WorkState.EATING) {
          // 수면 중이었는데 이전이 식사 중이었다면 식사로 복원
          this.setState(WorkState.EATING)
        } else if (this.currentState === WorkState.RESTING || this.currentState === WorkState.SLEEPING) {
          // 휴식/수면 중이었다면 현재 프로그램에 따라 상태 결정
          // onProgramChange가 호출되므로 여기서는 아무것도 하지 않음
          // (프로그램 감지 후 자동으로 작업/딴짓 상태로 전환됨)
        }
        break
    }
  }

  toggleEating() {
    if (this.currentState === WorkState.EATING) {
      const stateToRestore = this.previousState || WorkState.RESTING
      this.setState(stateToRestore)
    } else {
      this.previousState = this.currentState
      this.setState(WorkState.EATING)
    }
  }

  getCurrentState(): StateInfo {
    return {
      state: this.currentState,
      projectId: this.currentProject,
      programName: this.currentProgram,
      sessionStartTime: new Date(this.sessionStartTime),
      previousState: this.previousState
    }
  }

  getSessionDuration(): number {
    return Math.floor((Date.now() - this.sessionStartTime.getTime()) / 1000)
  }

  saveCurrentSession() {
    const now = new Date()
    const sessionDuration = Math.floor((now.getTime() - this.sessionStartTime.getTime()) / 1000)

    if (sessionDuration > 5) {
      this.dataManager.addWorkLog({
        projectId: this.currentProject,
        state: this.currentState,
        programName: this.currentProgram,
        startTime: this.sessionStartTime,
        endTime: now,
        duration: sessionDuration
      })
    }
  }
}