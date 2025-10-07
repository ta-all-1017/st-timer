import { EventEmitter } from 'events'
import { ActiveProgram } from './process-monitor'
import DataManager from '../store/data-manager'
import { NotificationManager } from '../notification-manager'

export enum WorkState {
  WORKING = 'working',
  HARDWORKING = 'hardworking',
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


export class StateManager extends EventEmitter {
  private currentState: WorkState = WorkState.RESTING
  private currentProject: string | null = null
  private sessionStartTime: Date = new Date()
  private previousState: WorkState | null = null
  private currentProgram: string | null = null
  private dataManager: DataManager
  private notificationManager: NotificationManager
  private lastBreakReminderTime: Date | null = null
  private workingStartTime: Date | null = null  // 작업 시작 시간 추적
  private restingStartTime: Date | null = null  // 휴식 시작 시간 추적

  constructor() {
    super()
    this.dataManager = DataManager.getInstance()
    this.notificationManager = new NotificationManager()
    this.currentProject = this.dataManager.getCurrentProject()
    console.log('StateManager initialized')
    
    // 1시간마다 휴식 알림 체크
    setInterval(() => this.checkBreakReminder(), 60000) // 1분마다 체크
    // 10분마다 딴짓 경고 체크
    setInterval(() => this.checkLongDistraction(), 60000) // 1분마다 체크
    // 열심히 상태 체크
    setInterval(() => this.checkHardworkingState(), 60000) // 1분마다 체크
    // 자는중 상태 체크
    setInterval(() => this.checkSleepingState(), 60000) // 1분마다 체크
  }

  setCurrentProject(projectId: string | null) {
    this.currentProject = projectId
  }


  private isProjectProgram(programName: string): boolean {
    if (!this.currentProject) {
      console.log('No current project set')
      return false
    }

    const projects = this.dataManager.getProjects()
    const project = projects.find(p => p.id === this.currentProject)

    if (!project || !project.programs || project.programs.length === 0) {
      console.log('Project not found or no programs registered:', this.currentProject)
      return false
    }

    console.log('Checking program:', programName, 'against project programs:', project.programs)
    
    const isMatch = project.programs.some(prog => {
      const programLower = programName.toLowerCase()
      const progLower = prog.toLowerCase()
      // 더 정확한 매칭: 완전 일치 또는 포함 관계 체크
      const matches = programLower === progLower || 
                     programLower.includes(progLower) || 
                     progLower.includes(programLower)
      
      if (matches) {
        console.log(`Match found: "${programName}" matches "${prog}"`)
      }
      return matches
    })

    console.log('Is project program?', isMatch)
    return isMatch
  }

  setState(state: WorkState, projectId?: string) {
    // 상태만 같으면 무시 (프로젝트 변경은 허용)
    if (this.currentState === state) {
      // 프로젝트만 변경되는 경우 처리
      if (projectId !== undefined && projectId !== this.currentProject) {
        console.log(`Project changed from ${this.currentProject} to ${projectId} while state remains ${state}`)
        this.currentProject = projectId
      }
      return
    }

    const now = new Date()
    const sessionDuration = Math.floor((now.getTime() - this.sessionStartTime.getTime()) / 1000)

    // 이전 세션 저장 - 작업중/열심히 상태에서만 시간 측정
    if (sessionDuration > 5) {
      const isWorkingState = this.currentState === WorkState.WORKING || this.currentState === WorkState.HARDWORKING
      const projectToSave = isWorkingState ? this.currentProject : null
      
      if (isWorkingState) {
        console.log(`💾 작업 시간 기록: state=${this.currentState}, projectId=${projectToSave}, duration=${sessionDuration}s`)
        this.dataManager.addWorkLog({
          projectId: projectToSave,
          state: this.currentState,
          programName: this.currentProgram,
          startTime: this.sessionStartTime,
          endTime: now,
          duration: sessionDuration
        })
      } else {
        console.log(`⏸️ 비작업 상태로 시간 기록하지 않음: state=${this.currentState}, duration=${sessionDuration}s`)
      }
    }

    const oldState = this.currentState
    this.previousState = this.currentState
    this.currentState = state

    // 프로젝트 ID 처리
    const previousProjectId = this.currentProject
    if (projectId !== undefined) {
      console.log(`📂 Project ID explicitly set to: ${projectId} (was: ${previousProjectId})`)
      this.currentProject = projectId
    } else {
      console.log(`📂 Project ID maintained: ${this.currentProject} (no projectId passed)`)
    }
    // projectId가 전달되지 않으면 현재 프로젝트 유지

    this.sessionStartTime = now

    // 딴짓 시간 추적은 더 이상 사용하지 않음 (새로운 상태 시스템)

    // 상태 변경 알림 발송
    if (oldState !== state) {
      this.notificationManager.sendStateChangeNotification(oldState, state)
    }

    // 목표 달성 체크
    this.checkGoalAchievement()

    this.emit('state-changed', this.getCurrentState())
  }

  onProgramChange(program: ActiveProgram) {
    this.currentProgram = program.name
    console.log('\n🔄 === Program Change Detected ===')
    console.log('📱 Program:', program.name)
    console.log('🔖 Current State:', this.currentState)
    console.log('📂 Current Project ID:', this.currentProject)
    
    // 프로젝트 정보 디버깅
    if (this.currentProject) {
      const projects = this.dataManager.getProjects()
      const currentProject = projects.find(p => p.id === this.currentProject)
      console.log('📋 Current Project Details:', {
        name: currentProject?.name,
        programs: currentProject?.programs
      })
    }

    // 밥 상태일 때는 모든 상태 변화 무시
    if (this.currentState === WorkState.EATING) {
      console.log('🍽️ 밥 중이므로 프로그램 변경 무시')
      return
    }

    // 프로젝트가 선택되지 않은 경우 -> 이는 오버레이에서 처리됨
    if (!this.currentProject) {
      console.log('⚠️ 프로젝트가 선택되지 않음 - 오버레이에서 메시지 표시 필요')
      if (this.currentState !== WorkState.RESTING) {
        this.setState(WorkState.RESTING)
      }
      return
    }

    // 프로젝트가 선택된 경우
    const isProjectProg = this.isProjectProgram(program.name)

    if (isProjectProg) {
      // 프로젝트 프로그램 사용 -> 작업중
      console.log('✅ 프로젝트 프로그램 감지 -> 작업중 상태로 전환')
      if (this.currentState !== WorkState.WORKING && this.currentState !== WorkState.HARDWORKING) {
        this.setState(WorkState.WORKING, this.currentProject)
        this.workingStartTime = new Date()  // 작업 시작 시간 기록
        this.restingStartTime = null  // 휴식 시간 리셋
        console.log('💪 작업 시작 시간 기록:', this.workingStartTime)
      }
    } else {
      // 프로젝트 프로그램이 아닌 다른 프로그램 사용 -> 즉시 휴식중
      console.log('😴 프로젝트 프로그램이 아님 -> 휴식중 상태로 전환')
      if (this.currentState !== WorkState.RESTING) {
        this.setState(WorkState.RESTING, this.currentProject)
        this.workingStartTime = null  // 작업 시간 리셋
        this.restingStartTime = new Date()  // 휴식 시작 시간 기록
        console.log('😴 휴식 시작 시간 기록:', this.restingStartTime)
      }
    }
  }

  onIdleDetected(type: 'idle-resting' | 'idle-sleeping' | 'idle-resume') {
    switch (type) {
      case 'idle-resting':
        // 밥 중이 아니면 휴식 상태로 전환
        if (this.currentState !== WorkState.EATING) {
          console.log('😴 컴퓨터 미사용으로 휴식중 상태로 전환')
          this.setState(WorkState.RESTING, this.currentProject || undefined)
          this.workingStartTime = null  // 작업 시간 리셋
          this.restingStartTime = new Date()  // 휴식 시작 시간 기록
        }
        break

      case 'idle-sleeping':
        // 밥 중이었다면 기록해두고, 자는중 상태로 전환
        if (this.currentState === WorkState.EATING) {
          this.previousState = WorkState.EATING
        }
        console.log('💤 장시간 미사용으로 자는중 상태로 전환')
        this.setState(WorkState.SLEEPING, this.currentProject || undefined)
        this.workingStartTime = null  // 작업 시간 리셋
        break

      case 'idle-resume':
        console.log('🔄 컴퓨터 사용 재개')
        // 활동 재개 시 상태 복원
        if (this.currentState === WorkState.SLEEPING && this.previousState === WorkState.EATING) {
          // 자는중이었는데 이전이 밥이었다면 밥으로 복원
          console.log('🍽️ 밥 상태 복원')
          this.setState(WorkState.EATING)
        } else if (this.currentState === WorkState.RESTING || this.currentState === WorkState.SLEEPING) {
          // 휴식/수면 중이었다면 현재 프로그램에 따라 상태 재평가
          console.log('⚡ 휴식/수면에서 복귀 - 현재 프로그램 확인 중')
          if (this.currentProgram) {
            console.log(`🔍 프로그램 변경 체크 트리거: ${this.currentProgram}`)
            this.onProgramChange({ name: this.currentProgram, title: this.currentProgram })
          } else {
            console.log('⚠️ 현재 프로그램 감지되지 않음')
          }
        }
        break
    }
  }

  // 열심히 상태 체크
  private checkHardworkingState() {
    if (this.currentState === WorkState.WORKING && this.workingStartTime) {
      const settings = this.dataManager.getSettings()
      const workingDuration = (new Date().getTime() - this.workingStartTime.getTime()) / 1000
      
      if (workingDuration >= settings.hardworkingThreshold) {
        console.log(`🔥 작업을 ${Math.floor(workingDuration/60)}분간 지속 -> 열심히 상태로 전환`)
        this.setState(WorkState.HARDWORKING, this.currentProject || undefined)
      }
    }
  }

  // 자는중 상태 체크
  private checkSleepingState() {
    if (this.currentState === WorkState.RESTING && this.restingStartTime) {
      const settings = this.dataManager.getSettings()
      const restingDuration = (new Date().getTime() - this.restingStartTime.getTime()) / 1000
      
      if (restingDuration >= settings.sleepingThreshold) {
        console.log(`😴 휴식을 ${Math.floor(restingDuration/60)}분간 지속 -> 자는중 상태로 전환`)
        this.setState(WorkState.SLEEPING, this.currentProject || undefined)
        this.restingStartTime = null
      }
    }
  }

  toggleEating() {
    if (this.currentState === WorkState.EATING) {
      const stateToRestore = this.previousState || WorkState.RESTING
      this.setState(stateToRestore, this.currentProject || undefined)
    } else {
      this.previousState = this.currentState
      this.setState(WorkState.EATING, this.currentProject || undefined)
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

  private checkGoalAchievement() {
    if (!this.currentProject) return

    const projects = this.dataManager.getProjects()
    const project = projects.find(p => p.id === this.currentProject)
    if (!project) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const stats = this.dataManager.getStatistics(today, tomorrow)
    const projectWorkTime = stats.logs
      .filter((log: any) => log.projectId === this.currentProject && (log.state === 'working' || log.state === 'distracted'))
      .reduce((total: number, log: any) => total + log.duration, 0)

    const goalSeconds = project.dailyGoal * 3600
    
    if (projectWorkTime >= goalSeconds) {
      this.notificationManager.sendGoalAchievedNotification(project.name, project.dailyGoal)
    }
  }

  private checkLongDistraction() {
    // 새로운 상태 시스템에서는 딴짓 상태 추적을 하지 않음
    // 휴식중 상태가 딴짓을 대체함
    return
  }

  private checkBreakReminder() {
    if (this.currentState !== WorkState.WORKING && this.currentState !== WorkState.HARDWORKING) return

    const now = new Date()
    const workDuration = Math.floor((now.getTime() - this.sessionStartTime.getTime()) / 1000)
    
    // 1시간마다 휴식 권장 (3600초)
    if (workDuration >= 3600 && (!this.lastBreakReminderTime || 
        (now.getTime() - this.lastBreakReminderTime.getTime()) >= 3600000)) {
      this.notificationManager.sendBreakReminder(workDuration)
      this.lastBreakReminderTime = now
    }
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