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
  return `${hours}시간 ${minutes}분`
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

  useEffect(() => {
    loadProjects()
    loadProjectTimes()
  }, [])

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
        if (log.state === 'working' && log.projectId) {
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">프로젝트 관리</h1>
        <button
          onClick={() => {
            setIsCreating(true)
            setSelectedProject(null)
            setFormData({ name: '', color: '#3B82F6', dailyGoal: 8, programs: [] })
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          새 프로젝트
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4">프로젝트 목록</h2>
            <div className="space-y-2">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => selectProject(project)}
                  className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                    selectedProject?.id === project.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: project.color }}
                      />
                      <div>
                        <h3 className="font-medium">{project.name}</h3>
                        <p className="text-sm text-gray-500">목표: {project.dailyGoal}시간</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-blue-600">
                        {formatTime(projectTimes[project.id] || 0)}
                      </p>
                      <p className="text-xs text-gray-400">오늘 작업</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Project Details */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            {(selectedProject || isCreating) ? (
              <>
                <h2 className="text-xl font-semibold mb-4">
                  {isCreating ? '새 프로젝트 만들기' : '프로젝트 편집'}
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      프로젝트 이름
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      placeholder="프로젝트 이름을 입력하세요"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      프로젝트 색상
                    </label>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-20 h-10 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      일일 목표 시간 (시간)
                    </label>
                    <input
                      type="number"
                      value={formData.dailyGoal}
                      onChange={(e) => setFormData({ ...formData, dailyGoal: Number(e.target.value) })}
                      className="w-32 p-2 border border-gray-300 rounded-lg"
                      min="1"
                      max="24"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      관련 프로그램 ({formData.programs.length}개)
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.programs.length > 0 ? (
                        formData.programs.map((program, index) => (
                          <span
                            key={`${program}-${index}`}
                            className="bg-gray-100 px-3 py-1 rounded-full text-sm flex items-center"
                          >
                            {program}
                            <button
                              onClick={() => removeProgram(program)}
                              className="ml-2 text-red-500 hover:text-red-700"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500 text-sm">프로그램이 추가되지 않았습니다.</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={addProgram}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      + 프로그램 추가
                    </button>
                  </div>

                  <div className="flex space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={isCreating ? handleCreateProject : handleUpdateProject}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      {isCreating ? '프로젝트 생성' : '변경사항 저장'}
                    </button>

                    {!isCreating && selectedProject && (
                      <button
                        onClick={() => handleDeleteProject(selectedProject.id)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                      >
                        프로젝트 삭제
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedProject(null)
                        setIsCreating(false)
                      }}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>프로젝트를 선택하거나 새 프로젝트를 생성하세요.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Program Add Modal */}
      {showProgramModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">프로그램 추가</h3>
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
              className="w-full p-3 border border-gray-300 rounded-lg mb-4"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={handleCancelAddProgram}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleAddProgram}
                disabled={!programInput.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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