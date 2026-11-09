@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
 echo Vui long cai dat Node.js 22 tro len (khuyen dung Node.js 24 LTS): https://nodejs.org
 pause
 exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0])<22){console.error('Node.js 22 or later is required');process.exit(1)}"
if errorlevel 1 goto failed

if not exist ".env.vps" (
 echo Khoi tao .env.vps tu .env.pc.example...
 copy ".env.pc.example" ".env.vps" >nul
 if errorlevel 1 goto failed
)
if not exist "config\firebase-web.json" (
 if exist "config\firebase-web.example.json" (
  echo Khoi tao config/firebase-web.json tu config/firebase-web.example.json...
  copy "config\firebase-web.example.json" "config\firebase-web.json" >nul
 )
)

if not exist "node_modules\.package-lock.json" (
 echo Dang cai dat cac goi thu vien npm...
 call npm.cmd ci --ignore-scripts --no-fund --no-audit
 if errorlevel 1 goto failed
)

echo Dang build he thong VPS/PC...
call npm.cmd run build:vps
if errorlevel 1 goto failed

echo.
echo =====================================================================
echo Luu y: Dam bao PostgreSQL dang chay tai 127.0.0.1:5432 (hoac bat Docker)
echo Neu dung Docker: docker compose -f compose.vps.yaml up -d postgres
echo =====================================================================
echo.
echo Dang khoi dong may chu tai http://localhost:3000 ...
echo Nhan Ctrl+C de dung may chu.
echo.

call npm.cmd run start:vps
if errorlevel 1 goto failed
exit /b 0

:failed
echo.
echo [LOI] Khoi dong hoac build that bai.
echo Kiem tra:
echo 1. PostgreSQL da duoc bat va DATABASE_URL trong .env.vps co dung khong?
echo 2. Thong tin Firebase trong config/firebase-web.json da hop le chua?
pause
exit /b 1
