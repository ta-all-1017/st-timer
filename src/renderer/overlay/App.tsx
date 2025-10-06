import React, { useState, useRef, useEffect } from 'react'
import { useTimer } from '../shared/hooks/useTimer'

function App() {
  const { formattedSessionTime, formattedTotalTime, currentState } = useTimer()
  const [isDragging, setIsDragging] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [stateImages, setStateImages] = useState<{ [key: string]: string }>({})
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const getStateColor = (state: string) => {
    switch (state) {
      case 'working':
        return 'text-green-600'
      case 'distracted':
        return 'text-red-600'
      case 'resting':
        return 'text-blue-600'
      case 'eating':
        return 'text-orange-600'
      case 'sleeping':
        return 'text-purple-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStateLabel = (state: string) => {
    switch (state) {
      case 'working':
        return '작업 중'
      case 'distracted':
        return '딴짓 중'
      case 'resting':
        return '휴식 중'
      case 'eating':
        return '식사 중'
      case 'sleeping':
        return '자는 중'
      default:
        return '알 수 없음'
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
    setShowContextMenu(true)
  }

  const handleClickOutside = (e: MouseEvent) => {
    if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
      setShowContextMenu(false)
    }
  }

  const handleDoubleClick = () => {
    window.electron.openDashboard()
  }

  const handleToggleEating = () => {
    window.electron.toggleEating()
    setShowContextMenu(false)
  }

  const handleOpenDashboard = () => {
    window.electron.openDashboard()
    setShowContextMenu(false)
  }

  // Load state images on mount
  useEffect(() => {
    const loadStateImages = async () => {
      try {
        const states = ['working', 'distracted', 'resting', 'eating', 'sleeping']
        const images: { [key: string]: string } = {}

        for (const state of states) {
          try {
            const imagePath = await window.electron.getStateImage(state)
            if (imagePath) {
              const imageUrl = imagePath.replace(/\\/g, '/')
              images[state] = imageUrl
            }
          } catch (error) {
            // Silently fail if image doesn't exist
          }
        }

        setStateImages(images)
      } catch (error) {
        console.error('Failed to load state images:', error)
      }
    }

    loadStateImages()
    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [])

  // Reload state images when state changes (in case image was updated)
  useEffect(() => {
    const reloadStateImage = async () => {
      try {
        const imagePath = await window.electron.getStateImage(currentState)
        if (imagePath) {
          const baseUrl = imagePath.replace(/\\/g, '/')
          const newImageUrl = `${baseUrl}?${Date.now()}`
          setStateImages(prev => ({
            ...prev,
            [currentState]: newImageUrl
          }))
        }
      } catch (error) {
        // Silently fail if image doesn't exist
      }
    }

    if (currentState) {
      reloadStateImage()
    }
  }, [currentState])

  return (
    <>
      <div
        className="w-[200px] h-auto flex flex-col items-center select-none"
        style={{
          WebkitAppRegion: isDragging ? 'no-drag' : 'drag' as any
        }}
        onMouseDown={() => setIsDragging(false)}
        onMouseUp={() => setIsDragging(false)}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
      > 
      {/* Today Total Time */}
      <div className="text-center bg-black/30 rounded-lg px-3 py-2 mb-3">
        <p className="text-xs text-white/80">현재 프로젝트 오늘 작업 시간</p>
        <div className="text-2xl font-bold text-white">
          {formattedTotalTime}
        </div>
      </div>

      {/* Character Image */}
      <div className="flex items-center justify-center">
        {stateImages[currentState] ? (
          <div className="relative w-full h-full">
            <img
              src={stateImages[currentState]}
              alt={getStateLabel(currentState)}
              className="w-full h-full object-contain drop-shadow-lg"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                const fallback = document.getElementById(`emoji-fallback-${currentState}`)
                if (fallback) {
                  fallback.style.display = 'block'
                }
              }}
            />
            {/* Emoji fallback when custom image fails to load */}
            <div
              className="absolute inset-0 flex items-center justify-center text-6xl drop-shadow-lg"
              style={{ display: 'none' }}
              id={`emoji-fallback-${currentState}`}
            >
              {currentState === 'working' && '💻'}
              {currentState === 'distracted' && '📱'}
              {currentState === 'resting' && '😌'}
              {currentState === 'eating' && '🍽️'}
              {currentState === 'sleeping' && '😴'}
            </div>
          </div>
        ) : (
          <div className="text-6xl drop-shadow-lg">
            {currentState === 'working' && '💻'}
            {currentState === 'distracted' && '📱'}
            {currentState === 'resting' && '😌'}
            {currentState === 'eating' && '🍽️'}
            {currentState === 'sleeping' && '😴'}
          </div>
        )}
      </div>
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white rounded-lg shadow-lg border py-2 min-w-[150px] z-50"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y
          }}
        >
          <button
            className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
            onClick={handleOpenDashboard}
          >
            대시보드 열기
          </button>
          <button
            className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
            onClick={handleToggleEating}
          >
            {currentState === 'eating' ? '식사 종료' : '식사 시작'}
          </button>
          <hr className="my-1" />
          <button
            className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm text-red-600"
            onClick={() => {
              window.electron.quit()
              setShowContextMenu(false)
            }}
          >
            종료
          </button>
        </div>
      )}
    </>
  )
}

export default App