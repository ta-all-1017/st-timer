import React, { useState, useEffect } from 'react'

interface Project {
  id: string
  name: string
  color: string
  programs: string[]
  dailyGoal: number
  createdAt: Date
}

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

const getTodayStart = (): Date => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    dailyGoal: 8,
    programs: [] as string[]
  })
  const [showProgramModal, setShowProgramModal] = useState(false)
  const [programInput, setProgramInput] = useState('')
  const [projectTimes, setProjectTimes] = useState<{ [key: string]: number }>({})
  const [themeColor, setThemeColor] = useState('#10b981')

  useEffect(() => {
    loadProjects()
    loadProjectTimes()
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

  const loadProjects = async () => {
    try {
      const projectList = await window.electron.getProjects()
      setProjects(projectList)
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
  }

  const loadProjectTimes = async () => {
    try {
      const todayStart = getTodayStart()
      const todayEnd = new Date()
      const stats = await window.electron.getStatistics(todayStart, todayEnd)

      const times: { [key: string]: number } = {}

      stats.logs.forEach((log: any) => {
        // 프로젝트 작업 시간 카운트 (working과 hardworking 상태)
        if (log.projectId && (log.state === 'working' || log.state === 'hardworking')) {
          times[log.projectId] = (times[log.projectId] || 0) + log.duration
        }
      })

      setProjectTimes(times)
    } catch (error) {
      console.error('Failed to load project times:', error)
    }
  }

  const handleCreateProject = async () => {
    if (!formData.name.trim()) {
      alert('프로젝트 이름을 입력해주세요.')
      return
    }

    try {
      console.log('Creating project with data:', formData)
      const result = await window.electron.createProject(formData)
      console.log('Project created:', result)
      setFormData({ name: '', color: '#3B82F6', dailyGoal: 8, programs: [] })
      setIsCreating(false)
      loadProjects()
      alert('프로젝트가 성공적으로 생성되었습니다.')
    } catch (error) {
      console.error('Failed to create project:', error)
      alert('프로젝트 생성에 실패했습니다.')
    }
  }

  const handleUpdateProject = async () => {
    if (!selectedProject) return

    try {
      await window.electron.updateProject(selectedProject.id, formData)
      setSelectedProject(null)
      loadProjects()
    } catch (error) {
      console.error('Failed to update project:', error)
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (window.confirm('정말로 이 프로젝트를 삭제하시겠습니까?')) {
      try {
        await window.electron.deleteProject(projectId)
        setSelectedProject(null)
        loadProjects()
      } catch (error) {
        console.error('Failed to delete project:', error)
      }
    }
  }

  const selectProject = (project: Project) => {
    setSelectedProject(project)
    setFormData({
      name: project.name,
      color: project.color,
      dailyGoal: project.dailyGoal,
      programs: project.programs
    })
    setIsCreating(false)
  }

  const addProgram = () => {
    setShowProgramModal(true)
    setProgramInput('')
  }

  const handleAddProgram = () => {
    const program = programInput.trim()
    if (program && !formData.programs.includes(program)) {
      const newPrograms = [...formData.programs, program]
      console.log('Adding program:', program, 'New programs array:', newPrograms)
      setFormData({
        ...formData,
        programs: newPrograms
      })
      setShowProgramModal(false)
      setProgramInput('')
    } else if (formData.programs.includes(program)) {
      alert('이미 추가된 프로그램입니다.')
    }
  }

  const handleCancelAddProgram = () => {
    setShowProgramModal(false)
    setProgramInput('')
  }

  const removeProgram = (program: string) => {
    setFormData({
      ...formData,
      programs: formData.programs.filter(p => p !== program)
    })
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 mb-1">프로젝트</h1>
          <p className="text-slate-500 text-sm">프로젝트를 관리하고 각각의 시간을 추적하세요</p>
        </div>
        <button
          onClick={() => {
            setIsCreating(true)
            setSelectedProject(null)
            setFormData({ name: '', color: '#3B82F6', dailyGoal: 8, programs: [] })
          }}
          className="px-4 py-2 text-white font-medium rounded-lg transition-colors text-sm"
          style={{ backgroundColor: themeColor }}
          onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(110%)'}
          onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(100%)'}
        >
          + 새 프로젝트
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Project List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h2 className="text-base font-bold text-slate-800 mb-3">모든 프로젝트</h2>
            <div className="space-y-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => selectProject(project)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedProject?.id === project.id 
                      ? 'border-emerald-500 bg-emerald-50' 
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div
                        className="w-5 h-5 rounded-lg mr-3"
                        style={{ backgroundColor: project.color }}
                      />
                      <div>
                        <h3 className="font-bold text-slate-800">{project.name}</h3>
                        <p className="text-xs text-slate-500">목표: {project.dailyGoal}시간/일</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-emerald-600">
                        {formatTime(projectTimes[project.id] || 0)}
                      </p>
                      <p className="text-xs text-slate-400">오늘</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Project Details */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border-2 border-slate-100 p-8">
            {(selectedProject || isCreating) ? (
              <>
                <h2 className="text-2xl font-bold text-slate-800 mb-6">
                  {isCreating ? '새 프로젝트 만들기' : '프로젝트 편집'}
                </h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      프로젝트 이름
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-semibold text-slate-700 focus:outline-none focus:border-emerald-400 transition-colors"
                      placeholder="프로젝트 이름을 입력하세요"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      프로젝트 색상
                    </label>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-24 h-12 border-2 border-slate-100 rounded-xl cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      일일 목표 (시간)
                    </label>
                    <input
                      type="number"
                      value={formData.dailyGoal}
                      onChange={(e) => setFormData({ ...formData, dailyGoal: Number(e.target.value) })}
                      className="w-32 px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-semibold text-slate-700 focus:outline-none focus:border-emerald-400 transition-colors"
                      min="1"
                      max="24"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      관련 프로그램 ({formData.programs.length}개)
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.programs.length > 0 ? (
                        formData.programs.map((program, index) => (
                          <span
                            key={`${program}-${index}`}
                            className="bg-slate-100 px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 flex items-center"
                          >
                            {program}
                            <button
                              onClick={() => removeProgram(program)}
                              className="ml-2 text-rose-500 hover:text-rose-600 text-lg font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-sm">프로그램이 추가되지 않았습니다</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={addProgram}
                      className="text-emerald-500 hover:text-emerald-600 text-sm font-semibold"
                    >
                      + 프로그램 추가
                    </button>
                  </div>

                  <div className="flex space-x-3 pt-6 border-t-2 border-slate-100">
                    <button
                      type="button"
                      onClick={isCreating ? handleCreateProject : handleUpdateProject}
                      className="px-6 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
                    >
                      {isCreating ? '프로젝트 생성' : '변경사항 저장'}
                    </button>

                    {!isCreating && selectedProject && (
                      <button
                        onClick={() => handleDeleteProject(selectedProject.id)}
                        className="px-6 py-3 bg-rose-500 text-white font-semibold rounded-xl hover:bg-rose-600 transition-colors"
                      >
                        프로젝트 삭제
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedProject(null)
                        setIsCreating(false)
                      }}
                      className="px-6 py-3 bg-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-300 transition-colors"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📁</div>
                <p className="text-slate-500 text-lg">프로젝트를 선택하거나 새 프로젝트를 생성하세요</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Program Add Modal */}
      {showProgramModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-96">
            <h3 className="text-xl font-bold text-slate-800 mb-6">프로그램 추가</h3>
            <div className="mb-4">
              <input
                type="text"
                value={programInput}
                onChange={(e) => setProgramInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddProgram()
                  } else if (e.key === 'Escape') {
                    handleCancelAddProgram()
                  }
                }}
                placeholder="프로그램 이름을 입력하세요"
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-semibold text-slate-700 focus:outline-none focus:border-emerald-400 transition-colors"
                autoFocus
              />
              <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">
                  💡 팁: 프로그램 이름 예시:
                </p>
                <ul className="text-xs text-blue-600 mt-1">
                  <li>• macOS: "Visual Studio Code", "Google Chrome", "Cursor"</li>
                  <li>• Windows: "Code.exe", "chrome.exe", "Cursor.exe"</li>
                  <li>• 현재 사용 중인 프로그램 이름이 확실하지 않으면 대시보드에서 확인 가능</li>
                </ul>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancelAddProgram}
                className="px-6 py-3 bg-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-300 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleAddProgram}
                disabled={!programInput.trim()}
                className="px-6 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Projects