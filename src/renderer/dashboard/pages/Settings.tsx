import React, { useState, useEffect } from 'react'

interface Settings {
  restingThreshold: number
  sleepingThreshold: number
  overlayTransparency: number
  overlaySize: number
  textSize: number
  autoStart: boolean
  notifications: {
    stateChange: boolean
    goalAchieved: boolean
    longDistraction: boolean
  }
}

const Settings = () => {
  const [settings, setSettings] = useState<Settings>({
    restingThreshold: 300,
    sleepingThreshold: 1800,
    overlayTransparency: 90,
    overlaySize: 100,
    textSize: 14,
    autoStart: false,
    notifications: {
      stateChange: true,
      goalAchieved: true,
      longDistraction: true
    }
  })

  const [activeTab, setActiveTab] = useState('general')
  const [stateImages, setStateImages] = useState<{[key: string]: string}>({})
  const [uploadingState, setUploadingState] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
    loadStateImages()
  }, [])

  const loadSettings = async () => {
    try {
      const currentSettings = await window.electron.getSettings()
      setSettings(currentSettings)
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const loadStateImages = async () => {
    try {
      const states = ['working', 'distracted', 'resting', 'eating', 'sleeping']
      const images: {[key: string]: string} = {}

      for (const state of states) {
        const imagePath = await window.electron.getStateImage(state)
        if (imagePath) {
          images[state] = imagePath
        }
      }

      setStateImages(images)
    } catch (error) {
      console.error('Failed to load state images:', error)
    }
  }

  const saveSettings = async () => {
    try {
      await window.electron.updateSettings(settings)
      alert('설정이 저장되었습니다.')
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('설정 저장에 실패했습니다.')
    }
  }

  const updateSetting = async (key: keyof Settings, value: any) => {
    const newSettings = {
      ...settings,
      [key]: value
    }
    setSettings(newSettings)

    // 즉시 저장
    try {
      await window.electron.updateSettings(newSettings)
      console.log(`Setting ${key} updated to:`, value)
    } catch (error) {
      console.error('Failed to update setting:', error)
    }
  }

  const updateNotificationSetting = async (key: keyof Settings['notifications'], value: boolean) => {
    const newSettings = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: value
      }
    }
    setSettings(newSettings)

    // 즉시 저장
    try {
      await window.electron.updateSettings(newSettings)
      console.log(`Notification setting ${key} updated to:`, value)
    } catch (error) {
      console.error('Failed to update notification setting:', error)
    }
  }

  const handleImageUpload = async (state: string) => {
    try {
      setUploadingState(state)
      const imagePath = await window.electron.openImageDialog()

      if (imagePath) {
        await window.electron.setStateImage(state, imagePath)
        setStateImages(prev => ({
          ...prev,
          [state]: imagePath
        }))
        alert('이미지가 성공적으로 업로드되었습니다.')
      }
    } catch (error) {
      console.error('Failed to upload image:', error)
      alert('이미지 업로드에 실패했습니다.')
    } finally {
      setUploadingState(null)
    }
  }

  const handleImageReset = async (state: string) => {
    try {
      await window.electron.setStateImage(state, '')
      setStateImages(prev => {
        const newImages = { ...prev }
        delete newImages[state]
        return newImages
      })
      alert('기본 이미지로 복원되었습니다.')
    } catch (error) {
      console.error('Failed to reset image:', error)
      alert('이미지 복원에 실패했습니다.')
    }
  }

  const tabs = [
    { id: 'general', label: '일반' },
    { id: 'overlay', label: '오버레이' },
    { id: 'images', label: '이미지' },
    { id: 'notifications', label: '알림' }
  ]

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">설정</h1>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">일반 설정</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                휴식 중 전환 시간
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="60"
                  max="1800"
                  step="60"
                  value={settings.restingThreshold}
                  onChange={(e) => updateSetting('restingThreshold', Number(e.target.value))}
                  className="flex-1"
                />
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="60"
                    max="1800"
                    value={settings.restingThreshold}
                    onChange={(e) => updateSetting('restingThreshold', Number(e.target.value))}
                    className="w-20 p-2 border border-gray-300 rounded text-sm"
                  />
                  <span className="text-sm text-gray-600">초</span>
                </div>
              </div>
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>1분</span>
                <span>30분</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                수면 중 전환 시간
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="600"
                  max="10800"
                  step="300"
                  value={settings.sleepingThreshold}
                  onChange={(e) => updateSetting('sleepingThreshold', Number(e.target.value))}
                  className="flex-1"
                />
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="600"
                    max="10800"
                    value={settings.sleepingThreshold}
                    onChange={(e) => updateSetting('sleepingThreshold', Number(e.target.value))}
                    className="w-20 p-2 border border-gray-300 rounded text-sm"
                  />
                  <span className="text-sm text-gray-600">초</span>
                </div>
              </div>
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>10분</span>
                <span>180분</span>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoStart"
                checked={settings.autoStart}
                onChange={(e) => updateSetting('autoStart', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="autoStart" className="text-sm font-medium text-gray-700">
                시작 프로그램 등록
              </label>
            </div>
          </div>
        )}

        {/* Overlay Tab */}
        {activeTab === 'overlay' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">오버레이 설정</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                텍스트 크기: {settings.textSize}px
              </label>
              <select
                value={settings.textSize}
                onChange={(e) => updateSetting('textSize', Number(e.target.value))}
                className="w-32 p-2 border border-gray-300 rounded-lg"
              >
                <option value={12}>12px</option>
                <option value={14}>14px</option>
                <option value={16}>16px</option>
                <option value={18}>18px</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                배경 투명도: {settings.overlayTransparency}%
              </label>
              <input
                type="range"
                min="20"
                max="100"
                value={settings.overlayTransparency}
                onChange={(e) => updateSetting('overlayTransparency', Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>20%</span>
                <span>100%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                오버레이 크기: {settings.overlaySize}%
              </label>
              <input
                type="range"
                min="50"
                max="200"
                value={settings.overlaySize}
                onChange={(e) => updateSetting('overlaySize', Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>50%</span>
                <span>200%</span>
              </div>
            </div>
          </div>
        )}

        {/* Images Tab */}
        {activeTab === 'images' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">이미지 설정</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { state: 'working', label: '작업 중', emoji: '💻' },
                { state: 'distracted', label: '딴짓 중', emoji: '📱' },
                { state: 'resting', label: '휴식 중', emoji: '😌' },
                { state: 'eating', label: '식사 중', emoji: '🍽️' },
                { state: 'sleeping', label: '수면 중', emoji: '😴' }
              ].map((item) => (
                <div key={item.state} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium mb-2">{item.label}</h3>
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                      {item.emoji}
                    </div>
                    <div className="flex-1">
                      <button
                        onClick={() => handleImageUpload(item.state)}
                        disabled={uploadingState === item.state}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 mb-2 block disabled:opacity-50"
                      >
                        {uploadingState === item.state ? '업로드 중...' : '찾아보기'}
                      </button>
                      <button
                        onClick={() => handleImageReset(item.state)}
                        className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400 block"
                      >
                        기본값으로 복원
                      </button>
                      {stateImages[item.state] && (
                        <p className="text-xs text-gray-500 mt-1">커스텀 이미지 적용됨</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">권장 사항</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 지원 형식: PNG, GIF, WEBP</li>
                <li>• 권장 크기: 200x200px</li>
                <li>• 최대 파일 크기: 10MB</li>
              </ul>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">알림 설정</h2>

            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="stateChange"
                  checked={settings.notifications.stateChange}
                  onChange={(e) => updateNotificationSetting('stateChange', e.target.checked)}
                  className="mr-3"
                />
                <label htmlFor="stateChange" className="text-sm font-medium text-gray-700">
                  상태 전환 알림
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="goalAchieved"
                  checked={settings.notifications.goalAchieved}
                  onChange={(e) => updateNotificationSetting('goalAchieved', e.target.checked)}
                  className="mr-3"
                />
                <label htmlFor="goalAchieved" className="text-sm font-medium text-gray-700">
                  목표 시간 달성 알림
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="longDistraction"
                  checked={settings.notifications.longDistraction}
                  onChange={(e) => updateNotificationSetting('longDistraction', e.target.checked)}
                  className="mr-3"
                />
                <label htmlFor="longDistraction" className="text-sm font-medium text-gray-700">
                  장시간 딴짓 경고
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-8 pt-6 border-t">
          <button
            onClick={saveSettings}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
          >
            설정 저장
          </button>
        </div>
      </div>
    </div>
  )
}

export default Settings