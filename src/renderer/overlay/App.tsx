import React, { useState, useRef, useEffect } from 'react'
import { useTimer } from '../shared/hooks/useTimer'

function App() {
  const { formattedSessionTime, formattedTotalTime, currentState, stateInfo } = useTimer()
  const [isDragging, setIsDragging] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [stateImages, setStateImages] = useState<{ [key: string]: string }>({})
  const [overlaySettings, setOverlaySettings] = useState({
    textSize: 14,
    transparency: 90,
    size: 100
  })
  const [currentProject, setCurrentProject] = useState<string | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const getStateColor = (state: string) => {
    switch (state) {
      case 'working':
        return 'text-green-600'
      case 'hardworking':
        return 'text-orange-600'
      case 'resting':
        return 'text-blue-600'
      case 'eating':
        return 'text-yellow-600'
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
      case 'hardworking':
        return '열심히!'
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


  const handleOpenDashboard = () => {
    window.electron.openDashboard()
    setShowContextMenu(false)
  }

  // Load current project
  useEffect(() => {
    const loadCurrentProject = async () => {
      try {
        const projectId = await window.electron.getCurrentProject()
        setCurrentProject(projectId)
      } catch (error) {
        console.error('프로젝트 정보 로드 실패:', error)
      }
    }
    
    loadCurrentProject()
  }, [])

  // Load state images and settings on mount
  useEffect(() => {
    const loadStateImages = async () => {
      try {
        const states = ['working', 'hardworking', 'resting', 'eating', 'sleeping']
        const images: { [key: string]: string } = {}

        for (const state of states) {
          try {
            const imagePath = await window.electron.getStateImage(state)
            if (imagePath) {
              // macOS에서 file:// 프로토콜 사용
              let imageUrl = imagePath
              if (!imageUrl.startsWith('file://') && !imageUrl.startsWith('http')) {
                imageUrl = `file://${imagePath}`
              }
              imageUrl = imageUrl.replace(/\\/g, '/')
              images[state] = imageUrl
            }
          } catch (error) {
            console.log(`No custom image for state: ${state}`)
          }
        }

        setStateImages(images)
        console.log('Loaded state images:', images)
      } catch (error) {
        console.error('Failed to load state images:', error)
      }
    }

    const loadSettings = async () => {
      try {
        const settings = await window.electron.getSettings()
        setOverlaySettings({
          textSize: settings.textSize || 14,
          transparency: settings.overlayTransparency || 90,
          size: settings.overlaySize || 100
        })
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }

    loadStateImages()
    loadSettings()
    document.addEventListener('click', handleClickOutside)
    
    // 오버레이 설정 업데이트 리스너
    const handleOverlaySettingsUpdate = (event: any, newSettings: any) => {
      setOverlaySettings({
        textSize: newSettings.textSize || overlaySettings.textSize,
        transparency: newSettings.transparency || overlaySettings.transparency,
        size: newSettings.size || overlaySettings.size
      })
    }
    
    window.electron.ipcRenderer?.on('overlay-settings-update', handleOverlaySettingsUpdate)
    
    return () => {
      document.removeEventListener('click', handleClickOutside)
      window.electron.ipcRenderer?.off('overlay-settings-update', handleOverlaySettingsUpdate)
    }
  }, [])

  // 상태 변경 시 이미지 업데이트 (잔상 방지)
  useEffect(() => {
    const updateStateImage = async () => {
      try {
        console.log(`🔄 상태 변경 감지: ${currentState}`)
        
        // 먼저 현재 상태가 아닌 다른 모든 이미지 제거 (잔상 방지)
        setStateImages(prev => {
          const newImages: { [key: string]: string } = {}
          // 현재 상태만 유지하고 나머지는 제거
          if (prev[currentState]) {
            newImages[currentState] = prev[currentState]
          }
          return newImages
        })
        
        const imagePath = await window.electron.getStateImage(currentState)
        if (imagePath) {
          // macOS에서 file:// 프로토콜 사용
          let imageUrl = imagePath
          if (!imageUrl.startsWith('file://') && !imageUrl.startsWith('http')) {
            imageUrl = `file://${imagePath}`
          }
          imageUrl = imageUrl.replace(/\\/g, '/')
          
          // 강력한 캐시 무효화
          const timestampedUrl = `${imageUrl}?t=${Date.now()}&r=${Math.random()}`
          
          setStateImages({
            [currentState]: timestampedUrl  // 오직 현재 상태만
          })
          
          console.log(`🖼️ 상태 이미지 업데이트: ${currentState}`)
        } else {
          console.log(`📭 ${currentState} 상태에 대한 이미지 없음`)
          // 이미지가 없으면 완전히 비움
          setStateImages({})
        }
      } catch (error) {
        console.log(`❌ 상태 이미지 로드 실패: ${currentState}`, error)
        setStateImages({})
      }
    }

    if (currentState) {
      updateStateImage()
    }
  }, [currentState])

  const containerStyle = {
    WebkitAppRegion: isDragging ? 'no-drag' : 'drag' as any,
    fontSize: `${overlaySettings.textSize}px`
  }
  
  const backgroundStyle = {
    backgroundColor: `rgba(0, 0, 0, ${overlaySettings.transparency / 100 * 0.3})`
  }

  return (
    <>
      <div
        className="w-full h-full flex flex-col items-center justify-center select-none"
        style={containerStyle}
        onMouseDown={() => setIsDragging(false)}
        onMouseUp={() => setIsDragging(false)}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
      > 
        {/* Timer Section - Top */}
        <div 
          className="w-full text-center px-1 py-1"
          style={{ 
            backgroundColor: `rgba(0, 0, 0, ${overlaySettings.transparency / 100 * 0.5})`,
          }}
        >
          <p 
            className="text-white/80 font-medium" 
            style={{ fontSize: `${overlaySettings.textSize * 0.6}px` }}
          >
            오늘 작업 시간
          </p>
          <div 
            className="font-black text-white"
            style={{ fontSize: `${overlaySettings.textSize * 1.2}px` }}
          >
            {formattedTotalTime}
          </div>
        </div>
        
        {/* Character Image - Center */}
        <div className="flex-1 w-full h-full overflow-hidden" style={{ lineHeight: 0 }}>
          {!currentProject ? (
            // 프로젝트 미선택 시 메시지 표시
            <div 
              key="no-project"
              className="w-full h-full flex flex-col items-center justify-center"
              style={{ 
                fontSize: `${overlaySettings.textSize * 0.8}px`,
                margin: 0,
                padding: 8,
                lineHeight: 1.2,
                background: 'transparent'
              }}
            >
              <div style={{ fontSize: '60px', marginBottom: '8px' }}>⚠️</div>
              <div className="text-white text-center font-semibold bg-black/50 px-2 py-1 rounded">
                프로젝트를<br/>선택해주세요
              </div>
            </div>
          ) : stateImages[currentState] ? (
            <img
              key={`img-${currentState}-${Date.now()}`}
              src={stateImages[currentState]}
              alt=""
              className="w-full h-full object-contain block"
              style={{ 
                background: 'transparent',
                margin: 0,
                padding: 0,
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                display: 'block'
              }}
              onError={(e) => {
                console.error('❌ 이미지 로드 오류:', stateImages[currentState])
                setStateImages(prev => {
                  const newImages = { ...prev }
                  delete newImages[currentState]
                  return newImages
                })
              }}
              onLoad={() => {
                console.log('✅ 이미지 로드 성공:', currentState)
              }}
            />
          ) : (
            <div 
              key={`emoji-${currentState}-${Date.now()}`}
              className="w-full h-full flex items-center justify-center"
              style={{ 
                fontSize: '100px',
                margin: 0,
                padding: 0,
                lineHeight: 1,
                background: 'transparent'
              }}
            >
              {currentState === 'working' && '💻'}
              {currentState === 'hardworking' && '🔥'}
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
            top: contextMenuPosition.y,
            fontSize: `${overlaySettings.textSize}px`
          }}
        >
          <button
            className="w-full px-4 py-2 text-left hover:bg-gray-100"
            onClick={handleOpenDashboard}
          >
            대시보드 열기
          </button>
          <hr className="my-1" />
          <button
            className="w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600"
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