import { app, Tray, Menu, BrowserWindow } from 'electron'
import { IconGenerator } from './icon-generator'

export class TrayManager {
  private tray: Tray | null = null
  private mainWindow: BrowserWindow | null
  private overlayWindow: BrowserWindow | null

  constructor(mainWindow: BrowserWindow, overlayWindow: BrowserWindow) {
    this.mainWindow = mainWindow
    this.overlayWindow = overlayWindow
  }

  createTray() {
    // 기본 아이콘 생성
    const icon = IconGenerator.createTextIcon('으', '#10b981')
    this.tray = new Tray(icon)

    this.tray.setToolTip('으랏차차 작업레츠기릿')

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '대시보드 열기',
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.show()
            this.mainWindow.focus()
          }
        }
      },
      {
        label: '오버레이 표시/숨기기',
        click: () => {
          if (this.overlayWindow) {
            if (this.overlayWindow.isVisible()) {
              this.overlayWindow.hide()
            } else {
              this.overlayWindow.show()
            }
          }
        }
      },
      { type: 'separator' },
      {
        label: '종료',
        click: () => {
          app.quit()
        }
      }
    ])

    this.tray.setContextMenu(contextMenu)

    this.tray.on('click', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isVisible()) {
          this.mainWindow.hide()
        } else {
          this.mainWindow.show()
          this.mainWindow.focus()
        }
      }
    })
  }

  updateTrayIcon(state: string) {
    if (!this.tray) return
    
    const stateIcons: {[key: string]: { text: string; color: string }} = {
      working: { text: 'W', color: '#10b981' },
      distracted: { text: 'D', color: '#ef4444' },
      resting: { text: 'R', color: '#3b82f6' },
      eating: { text: 'E', color: '#f59e0b' },
      sleeping: { text: 'S', color: '#8b5cf6' }
    }
    
    const iconConfig = stateIcons[state] || stateIcons.working
    const newIcon = IconGenerator.createTextIcon(iconConfig.text, iconConfig.color)
    
    this.tray.setImage(newIcon)
    this.tray.setToolTip(`으랏차차 작업레츠기릿 - ${this.getStateLabel(state)}`)
  }
  
  private getStateLabel(state: string): string {
    const labels: {[key: string]: string} = {
      working: '작업 중',
      distracted: '딴짓 중',
      resting: '휴식 중',
      eating: '식사 중',
      sleeping: '자는 중'
    }
    return labels[state] || '알 수 없음'
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
    }
  }
}