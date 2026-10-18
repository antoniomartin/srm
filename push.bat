@echo off
title Subir SRM a GitHub
color 0A
echo ===============================================================
echo        SUBIENDO SRM PROFESIONAL A GITHUB (antoniomartin/srm)
echo ===============================================================
echo.
echo Conectando con GitHub...
echo Si es la primera vez, se abrira una ventana en tu navegador
echo para autorizar el acceso con tu cuenta de GitHub.
echo.

set "GIT_CMD=C:\Users\FamiliaMMV\AppData\Local\Microsoft\WinGet\Packages\Git.MinGit_Microsoft.Winget.Source_8wekyb3d8bbwe\cmd\git.exe"
if exist "%GIT_CMD%" (
    "%GIT_CMD%" push origin main
) else (
    git push origin main
)

echo.
if %ERRORLEVEL% equ 0 (
    color 0A
    echo ===============================================================
    echo   EXITO: Cambios subidos correctamente a GitHub!
    echo   Tu aplicacion se desplegara en unos minutos en:
    echo   https://antoniomartin.github.io/srm/
    echo ===============================================================
) else (
    color 0C
    echo ===============================================================
    echo   Hubo un problema o se cancelo el inicio de sesion.
    echo ===============================================================
)
echo.
pause
