import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useTimer } from '../shared/hooks/useTimer'
import Projects from './pages/Projects'
import Settings from './pages/Settings'
import Statistics from './pages/Statistics'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
            <h2 className="text-xl font-bold text-red-600 mb-4">오류가 발생했습니다</h2>
            <p className="text-gray-600 mb-4">
              애플리케이션에서 예상치 못한 오류가 발생했습니다.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              새로고침
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

const Dashboard = () => {
  const { formattedTotalTime, currentState } = useTimer()
  const [projects, setProjects] = React.useState<any[]>([])
  const [currentProject, setCurrentProject] = React.useState<any>(null)
  const [todayStats, setTodayStats] = React.useState<any>(null)
  const [goalProgress, setGoalProgress] = React.useState<{[key: string]: number}>({})
  const [themeColor, setThemeColor] = React.useState('#10b981')

  React.useEffect(() => {
    loadProjects()
    loadCurrentProject()
    loadTodayStats()
    loadThemeColor()
  }, [])

  const loadThemeColor = async () => {
    try {
      const settings = await window.electron.getSettings()
      setThemeColor(settings.themeColor || '#10b981')
    } catch (error) {
      console.error('Failed to load theme color:', error)
    }
  }

  React.useEffect(() => {
    // 매분마다 오늘 통계 업데이트
    const interval = setInterval(() => {
      loadTodayStats()
    }, 60000)
    
    return () => clearInterval(interval)
  }, [])

  const loadProjects = async () => {
    try {
      const projectList = await window.electron.getProjects()
      setProjects(projectList)
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
  }

  const loadCurrentProject = async () => {
    try {
      const projectId = await window.electron.getCurrentProject()
      if (projectId) {
        const projectList = await window.electron.getProjects()
        const project = projectList.find((p: any) => p.id === projectId)
        setCurrentProject(project)
      }
    } catch (error) {
      console.error('Failed to load current project:', error)
    }
  }

  const loadTodayStats = async () => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      const stats = await window.electron.getStatistics(today, tomorrow)
      setTodayStats(stats)
      
      // 프로젝트별 목표 진행률 계산
      const progress: {[key: string]: number} = {}
      projects.forEach(project => {
        const projectWorkTime = stats.logs
          .filter((log: any) => log.projectId === project.id && log.state === 'working')
          .reduce((total: number, log: any) => total + log.duration, 0)
        
        const goalSeconds = project.dailyGoal * 3600
        progress[project.id] = goalSeconds > 0 ? (projectWorkTime / goalSeconds) * 100 : 0
      })
      setGoalProgress(progress)
    } catch (error) {
      console.error('Failed to load today stats:', error)
    }
  }

  const handleProjectSelect = async (projectId: string | null) => {
    try {
      await window.electron.setCurrentProject(projectId)
      if (projectId) {
        const project = projects.find(p => p.id === projectId)
        setCurrentProject(project)
      } else {
        setCurrentProject(null)
      }
    } catch (error) {
      console.error('Failed to set current project:', error)
    }
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}시간 ${minutes}분`
  }

  const getTodayWorkTime = () => {
    if (!todayStats) return 0
    return todayStats.logs
      .filter((log: any) => log.state === 'working')
      .reduce((total: number, log: any) => total + log.duration, 0)
  }

  const getCurrentProjectTodayTime = () => {
    if (!todayStats || !currentProject) return 0
    return todayStats.logs
      .filter((log: any) => log.projectId === currentProject.id && log.state === 'working')
      .reduce((total: number, log: any) => total + log.duration, 0)
  }

  const getStateColor = (state: string) => {
    switch(state) {
      case 'working': return 'text-emerald-500'
      case 'distracted': return 'text-rose-500'
      case 'resting': return 'text-sky-500'
      case 'eating': return 'text-amber-500'
      case 'sleeping': return 'text-indigo-500'
      default: return 'text-slate-500'
    }
  }

  const getStateIcon = (state: string) => {
    switch(state) {
      case 'working': return '💚'
      case 'distracted': return '🔴'
      case 'resting': return '💙'
      case 'eating': return '🍽️'
      case 'sleeping': return '😴'
      default: return '⏸️'
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-slate-900 mb-1">대시보드</h1>
        <p className="text-slate-500 text-sm">생산성을 추적하고 시간을 효율적으로 관리하세요</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl border-2 border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${themeColor}20` }}>
              <span className="text-xl">⏱️</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">오늘</span>
          </div>
          <h3 className="text-xs font-medium text-slate-500 mb-2">총 작업 시간</h3>
          <p className="text-3xl font-black text-slate-900">{formattedTotalTime}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border-2 border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">{getStateIcon(currentState)}</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">실시간</span>
          </div>
          <h3 className="text-xs font-medium text-slate-500 mb-2">현재 상태</h3>
          <p className={`text-2xl font-black ${getStateColor(currentState)}`}>
            {currentState === 'working' && '작업 중'}
            {currentState === 'hardworking' && '열심히!'}
            {currentState === 'resting' && '휴식 중'}
            {currentState === 'eating' && '식사 중'}
            {currentState === 'sleeping' && '자는 중'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border-2 border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">📂</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">활성</span>
          </div>
          <h3 className="text-xs font-medium text-slate-500 mb-3">프로젝트</h3>
          <select
            value={currentProject?.id || ''}
            onChange={(e) => handleProjectSelect(e.target.value || null)}
            className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-lg font-medium text-sm text-slate-700 focus:outline-none focus:border-blue-400 transition-colors"
          >
            <option value="">프로젝트 선택 안함</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {currentProject && (
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">프로그램</span>
                <span className="text-xs font-bold text-slate-700">{currentProject.programs.length}개</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">일일 목표</span>
                <span className="text-xs font-bold text-slate-700">{currentProject.dailyGoal}시간</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 테스트용 버튼들 */}
      <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-100">
        <div className="flex items-center mb-3">
          <span className="text-xl mr-2">🧪</span>
          <h3 className="text-base font-bold text-slate-800">개발 테스트</h3>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">프로그램 시뮬레이션</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => window.electron.testProgramChange('Visual Studio Code')}
                className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors"
              >
                VS Code 테스트
              </button>
              <button
                onClick={() => window.electron.testProgramChange('Chrome')}
                className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors"
              >
                Chrome 테스트
              </button>
              <button
                onClick={() => window.electron.testProgramChange('Unknown Program')}
                className="px-3 py-1.5 bg-slate-500 text-white rounded-lg text-xs font-medium hover:bg-slate-600 transition-colors"
              >
                미등록 프로그램
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">강제 상태 변경</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => window.electron.forceStateChange('working')}
                className="px-3 py-1.5 text-white rounded-lg text-xs font-medium transition-colors"
                style={{ backgroundColor: themeColor }}
                onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(110%)'}
                onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(100%)'}
              >
                💚 작업 중
              </button>
              <button
                onClick={() => window.electron.forceStateChange('hardworking')}
                className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-medium hover:bg-orange-600 transition-colors"
              >
                🔥 열심히
              </button>
              <button
                onClick={() => window.electron.forceStateChange('resting')}
                className="px-3 py-1.5 bg-sky-500 text-white rounded-lg text-xs font-medium hover:bg-sky-600 transition-colors"
              >
                💙 휴식 중
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">프로젝트 설정</p>
            <button
              onClick={async () => {
                const result = await window.electron.addCursorToProject()
                alert(result.message)
                if (result.success) {
                  loadCurrentProject()
                }
              }}
              className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs font-medium hover:bg-purple-600 transition-colors"
            >
              ➕ 현재 프로젝트에 Cursor 추가
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}



const Sidebar = () => {
  const location = useLocation()
  const { currentState } = useTimer()
  const [themeColor, setThemeColor] = React.useState('#10b981')

  React.useEffect(() => {
    const loadThemeColor = async () => {
      try {
        const settings = await window.electron.getSettings()
        setThemeColor(settings.themeColor || '#10b981')
      } catch (error) {
        console.error('Failed to load theme color:', error)
      }
    }
    loadThemeColor()
  }, [])

  const menuItems = [
    { path: '/', label: '대시보드', icon: '📊', exact: true },
    { path: '/projects', label: '프로젝트', icon: '📁' },
    { path: '/statistics', label: '통계', icon: '📊' },
    { path: '/settings', label: '설정', icon: '⚙️' }
  ]

  const handleToggleEating = () => {
    window.electron.toggleEating()
  }

  return (
    <div className="w-60 bg-slate-900 h-full flex flex-col">
      <div className="p-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: themeColor }}>
            <span className="text-white font-black text-sm">으</span>
          </div>
          <h2 className="text-xl font-black text-white">으랏차차</h2>
        </div>
      </div>

      <nav className="flex-1 px-3">
        {menuItems.map((item) => {
          const isActive = item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path) && item.path !== '/'

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg mb-1 transition-all duration-200 ${
                !isActive ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : ''
              }`}
              style={isActive ? { backgroundColor: themeColor, color: 'white' } : {}}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-slate-800 space-y-3">
        {/* 식사 토글 버튼 */}
        <button
          onClick={handleToggleEating}
          className={`w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
            currentState === 'eating' 
              ? 'bg-amber-500 text-white' 
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
        >
          <span className="text-base">🍽️</span>
          <span>{currentState === 'eating' ? '식사 종료' : '식사 시작'}</span>
        </button>

        <div className="bg-slate-800 rounded-lg p-3">
          <p className="text-xs font-medium text-slate-500 mb-1">버전</p>
          <p className="text-xs font-bold text-white">1.0.0</p>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <Router basename="/dashboard">
        <div className="flex h-screen bg-slate-50 overflow-hidden">
          <div className="flex-shrink-0">
            <Sidebar />
          </div>

          <div className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App