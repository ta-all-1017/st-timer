# 으랏차차 작업레츠기릿 - 빌드 및 배포 가이드

## 🚀 빠른 시작

### 1. 개발 환경 준비
```bash
# 의존성 설치
npm install

# 개발 모드 실행 (테스트용)
npm run dev
```

### 2. 앱 빌드하기

#### macOS용 빌드
```bash
npm run build:mac
```
- 출력: `dist-app/으랏차차 작업레츠기릿.dmg`
- 배포: DMG 파일을 공유하면 됩니다

#### Windows용 빌드
```bash
npm run build:win
```
- 출력: `dist-app/으랏차차 작업레츠기릿 Setup 1.0.0.exe`
- 배포: Setup.exe 파일을 공유하면 됩니다

## 📱 배포 방법

### 방법 1: GitHub Releases (추천)
1. GitHub에 레포지토리 생성
2. 코드 푸시
3. Release 생성 및 빌드 파일 업로드
4. 다운로드 링크 공유

### 방법 2: 직접 파일 공유
- **Google Drive / Dropbox**: DMG/EXE 파일 업로드 후 링크 공유
- **카카오톡 / Discord**: 파일 직접 전송 (100MB 이하인 경우)

### 방법 3: 자동 업데이트 구현 (고급)
`electron-updater` 패키지를 사용하여 자동 업데이트 기능 추가 가능

## ⚠️ macOS 보안 경고 해결

사용자가 앱 실행 시 "개발자를 확인할 수 없음" 경고를 보면:

### 사용자 안내 방법:
1. **첫 실행 시**: 
   - 앱 우클릭 → "열기" 선택
   - 경고창에서 "열기" 버튼 클릭

2. **또는 시스템 설정에서**:
   - 시스템 설정 → 개인정보 보호 및 보안
   - "으랏차차 작업레츠기릿" 허용

### 개발자 인증서 (선택사항)
Apple Developer Program 가입 시 코드 서명 가능 ($99/년)

## 📊 현재 앱 기능

- ✅ 5가지 작업 상태 추적 (작업중, 열심히, 휴식중, 자는중, 식사중)
- ✅ 프로젝트별 시간 관리
- ✅ 자동 상태 전환
- ✅ 통계 및 차트
- ✅ 커스텀 이미지 설정
- ✅ 테마 색상 변경
- ✅ 트레이 아이콘 지원

## 🔧 문제 해결

### 빌드 오류 시
```bash
# node_modules 재설치
rm -rf node_modules
npm install

# 캐시 정리
npm cache clean --force
```

### Windows에서 macOS 앱 빌드 불가
- macOS 앱은 macOS에서만 빌드 가능
- GitHub Actions 사용하여 크로스 플랫폼 빌드 가능

## 📝 버전 관리

`package.json`에서 버전 변경:
```json
"version": "1.0.1"  // 버전 업데이트
```

## 💡 배포 전 체크리스트

- [ ] 모든 기능 테스트 완료
- [ ] 버전 번호 업데이트
- [ ] 빌드 테스트
- [ ] 설치 파일 테스트
- [ ] 사용 설명서 작성

## 📞 지원

문제가 있으면 GitHub Issues에 등록해주세요!