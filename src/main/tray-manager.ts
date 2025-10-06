import { app, Tray, Menu, BrowserWindow, nativeImage } from 'electron'
import * as path from 'path'

export class TrayManager {
  private tray: Tray | null = null
  private mainWindow: BrowserWindow | null
  private overlayWindow: BrowserWindow | null

  constructor(mainWindow: BrowserWindow, overlayWindow: BrowserWindow) {
    this.mainWindow = mainWindow
    this.overlayWindow = overlayWindow
  }

  createTray() {
    const iconPath = path.join(__dirname, '../../resources/icon.png')
    const icon = nativeImage.createFromPath(iconPath)

    if (!icon.isEmpty()) {
      this.tray = new Tray(icon)
    } else {
      const defaultIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
      this.tray = new Tray(defaultIcon)
    }

    this.tray.setToolTip('WorkTimer')

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

  destroy() {
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
    }
  }
}