import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useTimer } from '../shared/hooks/useTimer'
import Projects from './pages/Projects'
import Settings from './pages/Settings'

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

  React.useEffect(() => {
    loadProjects()
    loadCurrentProject()
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

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">대시보드</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">오늘 누적 작업 시간</h3>
          <p className="text-3xl font-bold text-blue-600">{formattedTotalTime}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">현재 상태</h3>
          <p className="text-2xl font-bold text-green-600">
            {currentState === 'working' && '작업 중'}
            {currentState === 'distracted' && '딴짓 중'}
            {currentState === 'resting' && '휴식 중'}
            {currentState === 'eating' && '식사 중'}
            {currentState === 'sleeping' && '자는 중'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">활성 프로젝트</h3>
          <select
            value={currentProject?.id || ''}
            onChange={(e) => handleProjectSelect(e.target.value || null)}
            className="w-full p-2 border border-gray-300 rounded-lg"
          >
            <option value="">프로젝트 선택 안함</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {currentProject && (
            <div className="mt-2">
              <p className="text-sm text-gray-600">
                등록된 프로그램: {currentProject.programs.length}개
              </p>
              <p className="text-sm text-gray-600">
                일일 목표: {currentProject.dailyGoal}시간
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 테스트용 버튼들 */}
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-3">🧪 테스트 (개발용)</h3>

        <div className="mb-4">
          <p className="text-sm text-yellow-700 mb-2">프로그램 시뮬레이션:</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => window.electron.testProgramChange('Visual Studio Code')}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
            >
              VS Code 테스트
            </button>
            <button
              onClick={() => window.electron.testProgramChange('Chrome')}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm"
            >
              Chrome 테스트
            </button>
            <button
              onClick={() => window.electron.testProgramChange('Unknown Program')}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
            >
              미등록 프로그램 테스트
            </button>
          </div>
        </div>

        <div>
          <p className="text-sm text-yellow-700 mb-2">강제 상태 변경:</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => window.electron.forceStateChange('working')}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm"
            >
              🟢 작업 중
            </button>
            <button
              onClick={() => window.electron.forceStateChange('distracted')}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm"
            >
              🔴 딴짓 중
            </button>
            <button
              onClick={() => window.electron.forceStateChange('resting')}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
            >
              🔵 휴식 중
            </button>
          </div>
        </div>

        <div>
          <p className="text-sm text-yellow-700 mb-2">프로젝트 설정:</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={async () => {
                const result = await window.electron.addCursorToProject()
                alert(result.message)
                if (result.success) {
                  loadCurrentProject() // 프로젝트 다시 로드
                }
              }}
              className="px-3 py-1 bg-purple-600 text-white rounded text-sm"
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

  const menuItems = [
    { path: '/', label: '📊 대시보드', exact: true },
    { path: '/projects', label: '📁 프로젝트' },
    { path: '/settings', label: '⚙️ 설정' }
  ]

  return (
    <div className="w-64 bg-white shadow-lg h-screen">
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-800">WorkTimer</h2>
      </div>

      <nav className="mt-6">
        {menuItems.map((item) => {
          const isActive = item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path) && item.path !== '/'

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-6 py-3 text-gray-700 hover:bg-gray-100 ${
                isActive ? 'bg-blue-50 border-r-4 border-blue-500 text-blue-700' : ''
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <Router basename="/dashboard">
        <div className="flex min-h-screen bg-gray-100">
          <Sidebar />

          <div className="flex-1">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App