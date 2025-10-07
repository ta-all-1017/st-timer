# 🪟 Windows 빌드 가이드

## 사전 준비

### 1. 필수 프로그램 설치
- **Node.js 18+**: https://nodejs.org/
- **Git**: https://git-scm.com/download/win
- **Visual Studio Build Tools** (선택): C++ 컴파일용

### 2. 소스 코드 다운로드
```powershell
# Git으로 클론
git clone https://github.com/yourusername/workletsgirit.git
cd workletsgirit

# 또는 ZIP 다운로드 후 압축 해제
```

## 🔨 빌드 단계

### PowerShell 또는 CMD에서:

```powershell
# 1. 의존성 설치
npm install

# 2. Windows용 빌드
npm run build:win

# 3. 빌드 결과물 확인
# dist-app 폴더에 생성됨:
# - 으랏차차 작업레츠기릿 Setup 1.0.0.exe (설치 파일)
```

## 📦 생성되는 파일들

### 설치 파일
- `dist-app/으랏차차 작업레츠기릿 Setup 1.0.0.exe`
- 용량: 약 80-100MB
- 자동 설치 프로그램

### 포터블 버전 (선택사항)
```powershell
# package.json 수정으로 포터블 버전 생성 가능
"win": {
  "target": ["nsis", "portable"]
}
```

## 🚀 배포 방법

### 1. 직접 공유
- **Google Drive/OneDrive**: EXE 파일 업로드 → 링크 공유
- **카카오톡/Discord**: 파일 직접 전송
- **USB/외장하드**: 오프라인 전달

### 2. GitHub Releases
1. GitHub 저장소에 푸시
2. Releases → Create new release
3. EXE 파일 업로드
4. 다운로드 링크 공유

### 3. 자체 서버 호스팅
- AWS S3, Azure Storage 등에 업로드
- 다운로드 페이지 제작

## ⚠️ Windows Defender 경고 해결

### 사용자에게 안내할 내용:

#### 첫 실행 시 "Windows가 PC를 보호했습니다" 경고
1. **"추가 정보"** 클릭
2. **"실행"** 버튼 클릭

#### Windows Defender 예외 추가
1. Windows 보안 → 바이러스 및 위협 방지
2. 설정 관리 → 제외 추가
3. 으랏차차 작업레츠기릿.exe 추가

## 🔐 코드 서명 (선택사항)

### 신뢰도 향상을 위한 코드 서명
- **비용**: 연 $200-500 (인증서 구매)
- **효과**: 보안 경고 감소

### 무료 대안: 자체 서명
```powershell
# 자체 서명 인증서 생성 (개발용)
New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=YourName"
```

## 🐛 문제 해결

### 빌드 오류: "node-gyp" 관련
```powershell
# Visual Studio Build Tools 설치 필요
npm install --global windows-build-tools
```

### 빌드 오류: "electron-builder" 관련
```powershell
# 캐시 정리 후 재설치
npm cache clean --force
rm -rf node_modules
npm install
```

### 앱 실행 시 깜빡임
- Windows Defender 실시간 검사 일시 중지
- 앱을 예외 목록에 추가

## 📋 체크리스트

빌드 전:
- [ ] Node.js 18+ 설치 확인
- [ ] package.json 버전 업데이트
- [ ] 모든 기능 테스트

빌드 후:
- [ ] 설치 파일 실행 테스트
- [ ] 바이러스 검사 통과 확인
- [ ] 다른 PC에서 테스트

## 💡 팁

### 빠른 빌드
```json
// package.json에 추가
"build:win-fast": "npm run build && electron-builder --win --dir"
```
설치 파일 없이 폴더 형태로 빠르게 빌드

### 자동 업데이트 구현
```javascript
// electron-updater 사용
npm install electron-updater
```

## 📞 지원

문제 발생 시:
1. GitHub Issues에 등록
2. 에러 로그 첨부 (`%APPDATA%/으랏차차 작업레츠기릿/logs`)
3. Windows 버전 및 Node.js 버전 명시