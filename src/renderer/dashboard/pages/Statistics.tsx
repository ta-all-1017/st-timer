import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

interface StatisticsData {
  logs: Array<{
    projectId: string | null
    state: string
    programName: string | null
    startTime: Date
    endTime: Date
    duration: number
  }>
}

interface DailyData {
  date: string
  working: number
  distracted: number
  resting: number
  eating: number
  sleeping: number
}

interface ProjectData {
  name: string
  hours: number
  color: string
}

const Statistics = () => {
  const [timeRange, setTimeRange] = useState('week') // 'week', 'month', 'year'
  const [statistics, setStatistics] = useState<StatisticsData>({ logs: [] })
  const [projects, setProjects] = useState<any[]>([])
  const [dailyData, setDailyData] = useState<DailyData[]>([])
  const [projectData, setProjectData] = useState<ProjectData[]>([])
  const [loading, setLoading] = useState(true)

  const stateColors = {
    working: '#10b981',
    hardworking: '#f97316',
    resting: '#3b82f6',
    eating: '#f59e0b',
    sleeping: '#8b5cf6'
  }

  const stateLabels = {
    working: '작업',
    hardworking: '열심히',
    resting: '휴식',
    eating: '식사',
    sleeping: '수면'
  }

  useEffect(() => {
    loadData()
  }, [timeRange])

  const getDateRange = () => {
    const end = new Date()
    const start = new Date()
    
    switch(timeRange) {
      case 'week':
        start.setDate(end.getDate() - 7)
        break
      case 'month':
        start.setMonth(end.getMonth() - 1)
        break
      case 'year':
        start.setFullYear(end.getFullYear() - 1)
        break
    }
    
    return { start, end }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const { start, end } = getDateRange()
      const [stats, projectList] = await Promise.all([
        window.electron.getStatistics(start, end),
        window.electron.getProjects()
      ])
      
      setStatistics(stats)
      setProjects(projectList)
      
      // 일별 데이터 가공
      const dailyStats = processDailyData(stats.logs, start, end)
      setDailyData(dailyStats)
      
      // 프로젝트별 데이터 가공
      const projectStats = processProjectData(stats.logs, projectList)
      setProjectData(projectStats)
      
    } catch (error) {
      console.error('Failed to load statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  const processDailyData = (logs: any[], start: Date, end: Date): DailyData[] => {
    const days: DailyData[] = []
    const current = new Date(start)
    
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      const dayLogs = logs.filter(log => {
        const logDate = new Date(log.startTime).toISOString().split('T')[0]
        return logDate === dateStr
      })
      
      const dayData: DailyData = {
        date: dateStr,
        working: 0,
        distracted: 0,
        resting: 0,
        eating: 0,
        sleeping: 0
      }
      
      dayLogs.forEach(log => {
        if (dayData[log.state as keyof DailyData] !== undefined) {
          (dayData[log.state as keyof DailyData] as number) += log.duration / 3600 // 시간 단위로 변환
        }
      })
      
      days.push(dayData)
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }

  const processProjectData = (logs: any[], projectList: any[]): ProjectData[] => {
    const projectStats: { [key: string]: number } = {}
    
    logs.forEach(log => {
      if (log.state === 'working' && log.projectId) {
        projectStats[log.projectId] = (projectStats[log.projectId] || 0) + log.duration
      }
    })
    
    return Object.entries(projectStats).map(([projectId, duration]) => {
      const project = projectList.find(p => p.id === projectId)
      return {
        name: project?.name || '알 수 없는 프로젝트',
        hours: Number((duration / 3600).toFixed(1)),
        color: project?.color || '#6b7280'
      }
    }).sort((a, b) => b.hours - a.hours)
  }

  const getTotalHours = () => {
    return statistics.logs.reduce((total, log) => {
      if (log.state === 'working') {
        return total + log.duration / 3600
      }
      return total
    }, 0)
  }

  const getAverageDaily = () => {
    const totalDays = Math.max(1, dailyData.length)
    return getTotalHours() / totalDays
  }

  const formatHours = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.floor((hours - h) * 60)
    return `${h}시간 ${m}분`
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-slate-500">통계를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 mb-1">통계</h1>
          <p className="text-slate-500 text-sm">생산성 분석과 작업 패턴을 확인하세요</p>
        </div>
        
        <div className="flex space-x-1">
          {[
            { value: 'week', label: '7일' },
            { value: 'month', label: '1개월' },
            { value: 'year', label: '1년' }
          ].map(option => (
            <button
              key={option.value}
              onClick={() => setTimeRange(option.value)}
              className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-colors ${
                timeRange === option.value
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <span className="text-lg">🎯</span>
            </div>
          </div>
          <h3 className="text-xs font-medium text-slate-500 mb-1">총 작업 시간</h3>
          <p className="text-xl font-black text-slate-900">{formatHours(getTotalHours())}</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-lg">📈</span>
            </div>
          </div>
          <h3 className="text-xs font-medium text-slate-500 mb-1">일평균 작업</h3>
          <p className="text-xl font-black text-slate-900">{formatHours(getAverageDaily())}</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-lg">📁</span>
            </div>
          </div>
          <h3 className="text-xs font-medium text-slate-500 mb-1">활성 프로젝트</h3>
          <p className="text-xl font-black text-slate-900">{projectData.length}개</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <span className="text-lg">⚡</span>
            </div>
          </div>
          <h3 className="text-xs font-medium text-slate-500 mb-1">기록된 세션</h3>
          <p className="text-xl font-black text-slate-900">{statistics.logs.length}개</p>
        </div>
      </div>

      {/* 차트 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        {/* 일별 작업 시간 차트 */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="text-base font-bold text-slate-800 mb-3">일별 작업 시간</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
              />
              <YAxis tickFormatter={(value) => `${value}h`} />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString('ko-KR')}
                formatter={(value: number, name: string) => [`${value.toFixed(1)}시간`, stateLabels[name as keyof typeof stateLabels]]}
              />
              <Bar dataKey="working" stackId="a" fill={stateColors.working} />
              <Bar dataKey="distracted" stackId="a" fill={stateColors.distracted} />
              <Bar dataKey="resting" stackId="a" fill={stateColors.resting} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 프로젝트별 작업 시간 */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="text-base font-bold text-slate-800 mb-3">프로젝트별 작업 시간</h2>
          {projectData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={projectData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="hours"
                  label={({ name, hours }) => `${name}: ${hours}h`}
                >
                  {projectData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}시간`, '작업 시간']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-400">
              프로젝트 작업 기록이 없습니다
            </div>
          )}
        </div>
      </div>

      {/* 프로젝트 순위 */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="text-base font-bold text-slate-800 mb-3">프로젝트 작업 시간 순위</h2>
        {projectData.length > 0 ? (
          <div className="space-y-2">
            {projectData.map((project, index) => (
              <div key={project.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center justify-center w-6 h-6 bg-slate-200 rounded text-xs font-bold">
                    {index + 1}
                  </div>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }}></div>
                  <span className="font-medium text-slate-800 text-sm">{project.name}</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{formatHours(project.hours)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-slate-400 text-sm">
            프로젝트 작업 기록이 없습니다
          </div>
        )}
      </div>
    </div>
  )
}

export default Statistics