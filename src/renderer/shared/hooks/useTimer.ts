import { useState, useEffect, useCallback, useRef } from 'react'

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

export interface TimerState {
  sessionTime: number
  todayTotalTime: number
  currentState: WorkState
  formattedSessionTime: string
  formattedTotalTime: string
  stateInfo: StateInfo | null
}

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const getTodayStart = (): Date => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

export const useTimer = (): TimerState => {
  const [sessionTime, setSessionTime] = useState(0)
  const [todayTotalTime, setTodayTotalTime] = useState(0)
  const [currentState, setCurrentState] = useState<WorkState>(WorkState.RESTING)
  const [stateInfo, setStateInfo] = useState<StateInfo | null>(null)

  // Use refs to access latest values without causing re-renders
  const stateInfoRef = useRef<StateInfo | null>(null)
  const currentStateRef = useRef<WorkState>(WorkState.RESTING)

  const calculateTodayTotal = useCallback(async (projectId?: string | null) => {
    try {
      const todayStart = getTodayStart()
      const todayEnd = new Date()
      const stats = await window.electron.getStatistics(todayStart, todayEnd)

      const workingTime = stats.logs
        .filter((log: any) => {
          const isWorking = log.state === WorkState.WORKING || log.state === WorkState.HARDWORKING
          const matchesProject = projectId ? log.projectId === projectId : true
          return isWorking && matchesProject
        })
        .reduce((sum: number, log: any) => sum + log.duration, 0)

      setTodayTotalTime(workingTime)
    } catch (error) {
      console.error('Failed to calculate today total:', error)
    }
  }, [])

  const updateSessionTime = useCallback((state: StateInfo) => {
    const sessionStartTime = new Date(state.sessionStartTime)
    const now = new Date()
    const duration = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000)
    const validDuration = Math.max(0, duration)

    setSessionTime(validDuration)
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    let midnightInterval: NodeJS.Timeout

    const handleStateChange = (newState: StateInfo) => {
      stateInfoRef.current = newState
      currentStateRef.current = newState.state
      setStateInfo(newState)
      setCurrentState(newState.state)
      setSessionTime(0)
      calculateTodayTotal(newState.projectId)
    }

    const initializeState = async () => {
      try {
        const initialState = await window.electron.getCurrentState()
        if (initialState) {
          handleStateChange(initialState)
        }
      } catch (error) {
        console.error('Failed to get initial state:', error)
      }
    }

    // Initialize
    initializeState()
    // calculateTodayTotal will be called by handleStateChange after getting initial state

    // Listen for state changes
    window.electron.onStateChange(handleStateChange)

    // Listen for timer updates from main process
    window.electron.onTimerUpdate((timerData) => {
      if (timerData) {
        setStateInfo(timerData)
        setCurrentState(timerData.state)
      }
    })

    return () => {
      if (interval) clearInterval(interval)
      if (midnightInterval) clearInterval(midnightInterval)
    }
  }, [calculateTodayTotal])

  // Separate useEffect for timer interval - runs continuously without restarting
  useEffect(() => {
    const interval = setInterval(() => {
      const currentStateInfo = stateInfoRef.current

      if (currentStateInfo) {
        const sessionStartTime = new Date(currentStateInfo.sessionStartTime)
        const now = new Date()
        const duration = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000)
        const validDuration = Math.max(0, duration)

        setSessionTime(validDuration)
      }
    }, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [calculateTodayTotal])

  // Separate useEffect for midnight check
  useEffect(() => {
    const checkMidnight = setInterval(() => {
      const now = new Date()
      if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0) {
        setTodayTotalTime(0)
        const currentProjectId = stateInfoRef.current?.projectId
        calculateTodayTotal(currentProjectId)
      }
    }, 1000)

    return () => {
      clearInterval(checkMidnight)
    }
  }, [calculateTodayTotal])

  // Calculate total time including current session
  const totalTimeWithSession = (currentState === WorkState.WORKING || currentState === WorkState.HARDWORKING)
    ? todayTotalTime + sessionTime
    : todayTotalTime

  return {
    sessionTime,
    todayTotalTime,
    currentState,
    formattedSessionTime: formatTime(sessionTime),
    formattedTotalTime: formatTime(totalTimeWithSession),
    stateInfo
  }
}