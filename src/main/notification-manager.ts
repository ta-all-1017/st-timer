import { Notification } from 'electron'
import DataManager from './store/data-manager'

export class NotificationManager {
  private dataManager: DataManager

  constructor() {
    this.dataManager = DataManager.getInstance()
  }

  private canSendNotification(type: 'stateChange' | 'goalAchieved' | 'longDistraction'): boolean {
    const settings = this.dataManager.getSettings()
    return settings.notifications[type]
  }

  sendStateChangeNotification(fromState: string, toState: string) {
    if (!this.canSendNotification('stateChange')) return

    const stateNames: {[key: string]: string} = {
      working: '작업 중',
      distracted: '딴짓 중', 
      resting: '휴식 중',
      eating: '식사 중',
      sleeping: '수면 중'
    }

    const notification = new Notification({
      title: '상태 변경',
      body: `${stateNames[fromState] || fromState}에서 ${stateNames[toState] || toState}로 전환되었습니다`,
      icon: this.getStateIcon(toState),
      silent: false
    })

    notification.show()
  }

  sendGoalAchievedNotification(projectName: string, goalHours: number) {
    if (!this.canSendNotification('goalAchieved')) return

    const notification = new Notification({
      title: '🎉 목표 달성!',
      body: `${projectName} 프로젝트의 일일 목표 ${goalHours}시간을 달성했습니다!`,
      silent: false
    })

    notification.show()
  }

  sendLongDistractionWarning(distractionTime: number) {
    if (!this.canSendNotification('longDistraction')) return

    const minutes = Math.floor(distractionTime / 60)
    
    const notification = new Notification({
      title: '⚠️ 집중력 경고',
      body: `${minutes}분째 딴짓하고 있습니다. 작업으로 돌아가세요!`,
      silent: false
    })

    notification.show()
  }

  sendBreakReminder(workTime: number) {
    if (!this.canSendNotification('stateChange')) return

    const hours = Math.floor(workTime / 3600)
    const minutes = Math.floor((workTime % 3600) / 60)
    
    const notification = new Notification({
      title: '🕐 휴식 권장',
      body: `${hours > 0 ? `${hours}시간 ` : ''}${minutes}분째 작업 중입니다. 잠시 휴식을 취하세요!`,
      silent: false
    })

    notification.show()
  }

  private getStateIcon(state: string): string {
    // 기본 이모지 아이콘 반환 (실제 아이콘 파일 경로로 변경 가능)
    const icons: {[key: string]: string} = {
      working: '💻',
      distracted: '📱', 
      resting: '😌',
      eating: '🍽️',
      sleeping: '😴'
    }
    return icons[state] || '⏱️'
  }
}