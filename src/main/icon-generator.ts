import { nativeImage } from 'electron'

export class IconGenerator {
  static createTrayIcon(state: string = 'working'): Electron.NativeImage {
    // 16x16 픽셀 아이콘 생성
    const size = 16
    const canvas = Buffer.alloc(size * size * 4) // RGBA

    // 배경을 투명하게 설정
    canvas.fill(0)

    // 상태에 따른 색상 설정
    const colors: { [key: string]: { r: number; g: number; b: number } } = {
      working: { r: 34, g: 197, b: 94 }, // 초록색
      distracted: { r: 239, g: 68, b: 68 }, // 빨간색
      resting: { r: 59, g: 130, b: 246 }, // 파란색
      eating: { r: 245, g: 158, b: 11 }, // 주황색
      sleeping: { r: 139, g: 92, b: 246 } // 보라색
    }

    const color = colors[state] || colors.working

    // 간단한 원 그리기
    const centerX = size / 2
    const centerY = size / 2
    const radius = 6

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX
        const dy = y - centerY
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance <= radius) {
          const index = (y * size + x) * 4
          canvas[index] = color.r // R
          canvas[index + 1] = color.g // G
          canvas[index + 2] = color.b // B
          canvas[index + 3] = 255 // A (불투명)
        }
      }
    }

    return nativeImage.createFromBuffer(canvas, { width: size, height: size })
  }

  static createTextIcon(text: string, color: string = '#10b981'): Electron.NativeImage {
    // SVG를 사용한 텍스트 아이콘 생성
    const svg = `
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="7" fill="${color}" />
        <text x="8" y="12" text-anchor="middle" fill="white" font-family="Arial" font-size="10" font-weight="bold">
          ${text}
        </text>
      </svg>
    `

    return nativeImage.createFromDataURL(
      `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
    )
  }
}
