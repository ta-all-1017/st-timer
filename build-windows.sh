#!/bin/bash

echo "🚀 Windows 빌드 시작..."

# 1. 임시로 active-win 제거
mv node_modules/active-win node_modules/active-win.backup 2>/dev/null

# 2. Windows 빌드 실행
npm run build:win --win --x64 --ia32

# 3. active-win 복구
mv node_modules/active-win.backup node_modules/active-win 2>/dev/null

echo "✅ Windows 빌드 완료!"
echo "📁 dist-app 폴더를 확인하세요"