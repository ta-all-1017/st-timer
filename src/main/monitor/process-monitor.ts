import { EventEmitter } from 'events'
import { exec } from 'child_process'
import { promisify } from 'util'

let activeWin: any = null

// ES 모듈을 동적으로 로드하는 함수
async function loadActiveWin() {
  try {
    console.log('🔍 active-win ES 모듈을 동적으로 로드 중...')
    const activeWinModule = await import('active-win')
    console.log('🔍 active-win 모듈 로드됨:', typeof activeWinModule)
    console.log('🔍 active-win 모듈 구조:', Object.keys(activeWinModule))
    
    // ES 모듈에서 default export 확인
    if (activeWinModule.default && typeof activeWinModule.default === 'function') {
      activeWin = activeWinModule.default
      console.log('✅ ES 모듈 default export 사용')
      return true
    } else if (typeof activeWinModule === 'function') {
      activeWin = activeWinModule
      console.log('✅ ES 모듈 직접 함수 사용')
      return true
    } else {
      console.error('❌ ES 모듈에서 함수를 찾을 수 없음:', Object.keys(activeWinModule))
      return false
    }
  } catch (error) {
    console.error('❌ ES 모듈 로드 실패, CommonJS 시도:', error)
    
    // CommonJS 방식으로 fallback
    try {
      const activeWinModule = require('active-win')
      console.log('🔍 CommonJS active-win 모듈 로드됨:', typeof activeWinModule)
      console.log('🔍 CommonJS active-win 모듈 구조:', Object.keys(activeWinModule))
      
      if (typeof activeWinModule === 'function') {
        activeWin = activeWinModule
        console.log('✅ CommonJS 직접 함수 사용')
        return true
      } else if (activeWinModule.default && typeof activeWinModule.default === 'function') {
        activeWin = activeWinModule.default
        console.log('✅ CommonJS default export 사용')
        return true
      } else {
        console.error('❌ CommonJS에서도 함수를 찾을 수 없음:', Object.keys(activeWinModule))
        return false
      }
    } catch (commonjsError) {
      console.error('❌ CommonJS 로드도 실패:', commonjsError)
      return false
    }
  }
}

// 모듈 로드 시도
loadActiveWin().then(success => {
  if (success) {
    console.log('✅ active-win 모듈 로드 성공')
  } else {
    console.error('❌ active-win 모듈 로드 완전 실패')
  }
})

export interface ActiveProgram {
  name: string
  title: string
  bundleId?: string
}

export class ProcessMonitor extends EventEmitter {
  private intervalId: NodeJS.Timeout | null = null
  private currentProgram: ActiveProgram | null = null
  private isMonitoring: boolean = false

  // macOS 전용 대안 방법 - AppleScript 사용
  async getMacOSActiveProgram(): Promise<ActiveProgram | null> {
    try {
      console.log('🍎 macOS 대안 방법 시도: AppleScript 사용')
      
      const script = `
        tell application "System Events"
          set frontApp to first application process whose frontmost is true
          set appName to name of frontApp
          set windowTitle to ""
          try
            set windowTitle to name of first window of frontApp
          end try
          return appName & "|" & windowTitle
        end tell
      `
      
      const execAsync = promisify(exec)
      const { stdout } = await execAsync(`osascript -e '${script}'`)
      const result = stdout.trim()
      console.log('🍎 AppleScript 결과:', result)
      
      if (result) {
        const [appName, windowTitle] = result.split('|')
        const program = {
          name: appName || 'Unknown',
          title: windowTitle || appName || 'Unknown',
          bundleId: undefined
        }
        console.log('✅ macOS에서 추출된 프로그램 정보:', program)
        return program
      }
    } catch (error) {
      console.error('❌ macOS AppleScript 실패:', error)
    }
    return null
  }

  async getCurrentActiveProgram(): Promise<ActiveProgram | null> {
    // active-win이 사용 가능하면 먼저 시도
    if (activeWin && typeof activeWin === 'function') {
      try {
        console.log('📞 active-win 함수 호출 중...')
        const window = await activeWin()
        console.log('📋 active-win 원시 결과:', JSON.stringify(window, null, 2))

        if (window) {
          // macOS에서 일반적인 구조들을 시도
          const possibleNames = [
            window.owner?.name,     // macOS 일반적인 구조
            window.app,             // 일부 구조
            window.processName,     // 프로세스 이름
            window.name,            // 직접 이름
            window.title,           // 제목을 이름으로
            'Unknown'
          ].filter(Boolean)

          const possibleTitles = [
            window.title,           // 일반적인 제목
            window.name,            // 이름을 제목으로
            window.owner?.name,     // 소유자 이름
            'Unknown'
          ].filter(Boolean)

          const program = {
            name: possibleNames[0] || 'Unknown',
            title: possibleTitles[0] || 'Unknown',
            bundleId: window.owner?.bundleId || window.bundleId
          }
          
          console.log('✅ active-win에서 추출된 프로그램 정보:', program)
          console.log('📦 Bundle ID:', program.bundleId)
          return program
        } else {
          console.log('❌ active-win이 null/undefined 반환')
        }
      } catch (error) {
        console.error('💥 active-win 오류:', error)
        console.error('💥 오류 세부사항:', error instanceof Error ? error.message : String(error))
      }
    } else {
      console.warn('🚨 active-win 사용 불가, 타입:', typeof activeWin)
      console.warn('🚨 activeWin 값:', activeWin)
    }

    // active-win 실패 시 macOS 대안 방법 시도
    console.log('🔄 active-win 실패, macOS 대안 방법 시도...')
    return await this.getMacOSActiveProgram()
  }

  async checkProgramChange() {
    const activeProgram = await this.getCurrentActiveProgram()

    if (activeProgram) {
      if (!this.currentProgram ||
          this.currentProgram.name !== activeProgram.name ||
          this.currentProgram.title !== activeProgram.title) {

        console.log(`🔄 Program changed from "${this.currentProgram?.name || 'none'}" to "${activeProgram.name}"`)
        console.log(`🖥️ Current Active Program: "${activeProgram.name}" | Title: "${activeProgram.title}"`)

        this.currentProgram = activeProgram
        this.emit('program-change', activeProgram)
      }
    } else {
      console.log(`⚠️ No active program detected`)
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