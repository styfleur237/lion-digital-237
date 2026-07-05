@echo off
title Lion Digital 237
echo ========================================
echo    LION DIGITAL 237 - PLATEFORME
echo ========================================
echo.

echo [1/2] Demarrage du backend...
start "Backend" cmd /c "cd backend && npm install && node server.js"
timeout /t 3 >nul

echo [2/2] Demarrage du frontend...
start "Frontend" cmd /c "cd frontend && npm install && npm start"

echo.
echo Backend: http://localhost:5000/api/health
echo Frontend: http://localhost:3000
echo.
echo Comptes de test:
echo   Admin: admin / Admin123!
echo   Demo:  demo / test123
echo.
pause