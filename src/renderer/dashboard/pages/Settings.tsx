import React, { useState, useEffect } from 'react'

interface Settings {
  restingThreshold: number
  sleepingThreshold: number
  overlayTransparency: number
  overlaySize: number
  textSize: number
  autoStart: boolean
  themeColor: string
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
    themeColor: '#10b981',
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
      const states = ['working', 'hardworking', 'resting', 'eating', 'sleeping']
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
    { id: 'general', label: '일반', icon: '⚙️' },
    { id: 'images', label: '이미지', icon: '🎨' },
    { id: 'notifications', label: '알림', icon: '🔔' }
  ]

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-black text-slate-900 mb-1">설정</h1>
        <p className="text-slate-500 text-sm">으랏차차 작업레츠기릿 앱을 커스터마이즈하세요</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center space-x-1 ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-5">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-slate-800">일반 설정</h2>


            <div className="bg-slate-50 rounded-lg p-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
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
                  className="flex-1 accent-indigo-500"
                />
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="600"
                    max="10800"
                    value={settings.sleepingThreshold}
                    onChange={(e) => updateSetting('sleepingThreshold', Number(e.target.value))}
                    className="w-24 px-3 py-2 bg-white border-2 border-slate-100 rounded-xl font-semibold text-slate-700 focus:outline-none focus:border-indigo-400"
                  />
                  <span className="text-sm font-semibold text-slate-600">초</span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-2">
                <span>10분</span>
                <span>180분</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                열심히 상태 전환 시간
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="300"
                  max="3600"
                  step="300"
                  value={settings.hardworkingThreshold}
                  onChange={(e) => updateSetting('hardworkingThreshold', Number(e.target.value))}
                  className="flex-1 accent-orange-500"
                />
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="300"
                    max="3600"
                    value={settings.hardworkingThreshold}
                    onChange={(e) => updateSetting('hardworkingThreshold', Number(e.target.value))}
                    className="w-24 px-3 py-2 bg-white border-2 border-slate-100 rounded-xl font-semibold text-slate-700 focus:outline-none focus:border-orange-400"
                  />
                  <span className="text-sm font-semibold text-slate-600">초</span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-2">
                <span>5분</span>
                <span>60분</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">작업 상태가 이 시간 동안 지속되면 '열심히' 상태로 전환됩니다.</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoStart"
                  checked={settings.autoStart}
                  onChange={(e) => updateSetting('autoStart', e.target.checked)}
                  className="w-5 h-5 text-emerald-500 border-2 border-slate-300 rounded focus:ring-emerald-400 mr-3"
                />
                <label htmlFor="autoStart" className="text-sm font-semibold text-slate-700">
                  시작 프로그램 등록
                </label>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                테마 색상 (Key Color)
              </label>
              <div className="grid grid-cols-6 gap-2">
                {[
                  { name: 'Emerald', color: '#10b981' },
                  { name: 'Blue', color: '#3b82f6' },
                  { name: 'Purple', color: '#8b5cf6' },
                  { name: 'Pink', color: '#ec4899' },
                  { name: 'Orange', color: '#f97316' },
                  { name: 'Red', color: '#ef4444' }
                ].map((theme) => (
                  <button
                    key={theme.name}
                    onClick={() => updateSetting('themeColor', theme.color)}
                    className={`w-12 h-12 rounded-lg border-2 transition-all ${
                      settings.themeColor === theme.color 
                        ? 'border-slate-900 scale-110' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    style={{ backgroundColor: theme.color }}
                    title={theme.name}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">선택한 색상이 앱의 주요 요소에 적용됩니다.</p>
            </div>
          </div>
        )}


        {/* Images Tab */}
        {activeTab === 'images' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-slate-800">이미지 설정</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { state: 'working', label: '작업 중', emoji: '💻' },
                { state: 'hardworking', label: '열심히 하는 중', emoji: '🔥' },
                { state: 'resting', label: '휴식 중', emoji: '😌' },
                { state: 'eating', label: '식사 중', emoji: '🍽️' },
                { state: 'sleeping', label: '수면 중', emoji: '😴' }
              ].map((item) => (
                <div key={item.state} className="bg-slate-50 rounded-xl p-6">
                  <h3 className="font-bold text-slate-800 mb-4">{item.label}</h3>
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 bg-white border-2 border-slate-100 rounded-xl flex items-center justify-center text-3xl">
                      {item.emoji}
                    </div>
                    <div className="flex-1">
                      <button
                        onClick={() => handleImageUpload(item.state)}
                        disabled={uploadingState === item.state}
                        className="w-full px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 mb-2 disabled:opacity-50 transition-colors"
                      >
                        {uploadingState === item.state ? '업로드 중...' : '찾아보기'}
                      </button>
                      <button
                        onClick={() => handleImageReset(item.state)}
                        className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-300 transition-colors"
                      >
                        기본값으로 복원
                      </button>
                      {stateImages[item.state] && (
                        <p className="text-xs text-emerald-600 font-semibold mt-2">✓ 커스텀 이미지 적용됨</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-sky-50 border-2 border-sky-100 rounded-xl p-6">
              <h4 className="font-bold text-sky-900 mb-3">📌 권장 사항</h4>
              <ul className="text-sm text-sky-700 space-y-2">
                <li className="flex items-center"><span className="mr-2">•</span> 지원 형식: PNG, GIF, WEBP</li>
                <li className="flex items-center"><span className="mr-2">•</span> 권장 크기: 200x200px</li>
                <li className="flex items-center"><span className="mr-2">•</span> 최대 파일 크기: 10MB</li>
              </ul>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-slate-800">알림 설정</h2>

            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="stateChange"
                    checked={settings.notifications.stateChange}
                    onChange={(e) => updateNotificationSetting('stateChange', e.target.checked)}
                    className="w-5 h-5 text-emerald-500 border-2 border-slate-300 rounded focus:ring-emerald-400 mr-4"
                  />
                  <div>
                    <label htmlFor="stateChange" className="text-base font-semibold text-slate-700">
                      상태 전환 알림
                    </label>
                    <p className="text-xs text-slate-500 mt-1">작업 상태가 변경될 때 알려드립니다</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="goalAchieved"
                    checked={settings.notifications.goalAchieved}
                    onChange={(e) => updateNotificationSetting('goalAchieved', e.target.checked)}
                    className="w-5 h-5 text-emerald-500 border-2 border-slate-300 rounded focus:ring-emerald-400 mr-4"
                  />
                  <div>
                    <label htmlFor="goalAchieved" className="text-base font-semibold text-slate-700">
                      목표 시간 달성 알림
                    </label>
                    <p className="text-xs text-slate-500 mt-1">일일 목표를 달성하면 축하 메시지를 보냅니다</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="longDistraction"
                    checked={settings.notifications.longDistraction}
                    onChange={(e) => updateNotificationSetting('longDistraction', e.target.checked)}
                    className="w-5 h-5 text-emerald-500 border-2 border-slate-300 rounded focus:ring-emerald-400 mr-4"
                  />
                  <div>
                    <label htmlFor="longDistraction" className="text-base font-semibold text-slate-700">
                      장시간 딴짓 경고
                    </label>
                    <p className="text-xs text-slate-500 mt-1">너무 오래 딴짓하면 알려드립니다</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-8 pt-6 border-t-2 border-slate-100">
          <button
            onClick={saveSettings}
            className="px-8 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
          >
            설정 저장
          </button>
        </div>
      </div>
    </div>
  )
}

export default Settings