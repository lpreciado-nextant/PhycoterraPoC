@echo off
setlocal
title PhycoTerra Purchasing Prototype

call :run
set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" (
    echo.
    echo The prototype could not run. Review the error above.
    pause
)
endlocal & exit /b %RESULT%

:run
where node.exe >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or is not on PATH.
    echo Install Node.js 24 with npm from https://nodejs.org/ and run this file again.
    exit /b 1
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not installed or is not on PATH.
    echo Install Node.js with npm from https://nodejs.org/ and run this file again.
    exit /b 1
)

pushd "%~dp0"
if errorlevel 1 (
    echo ERROR: Cannot open the app directory beside this batch file.
    exit /b 1
)

echo Checking for running prototype servers...
powershell.exe -NoProfile -Command "$ErrorActionPreference = 'Stop'; $app = (Get-Location).Path.TrimEnd('\') + '\'; $running = @(Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" | Where-Object { $_.CommandLine -and $_.CommandLine.IndexOf($app, [StringComparison]::OrdinalIgnoreCase) -ge 0 }); if ($running.Count -gt 0) { Write-Host 'ERROR: Close the running prototype development/preview servers before reinstalling dependencies.'; $running | ForEach-Object { Write-Host ('Project Node process ID: ' + $_.ProcessId) }; exit 1 }; if (@([System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() | Where-Object { $_.Port -eq 5173 }).Count -gt 0) { Write-Host 'ERROR: Port 5173 is already in use. Stop its server before running this launcher.'; exit 1 }"
if not "%ERRORLEVEL%"=="0" (
    echo ERROR: Startup checks failed. No dependencies were changed.
    popd
    exit /b 1
)

echo Installing dependencies from package-lock.json...
call npm.cmd ci
if not "%ERRORLEVEL%"=="0" (
    echo ERROR: Dependency installation failed. Check the npm output above.
    echo For EPERM or locked-file errors, close this project's development/preview servers and retry.
    popd
    exit /b 1
)

echo.
echo Starting PhycoTerra at http://127.0.0.1:5173
echo Keep this window open while using the prototype.
echo Press Ctrl+C to stop the server. If prompted to terminate the batch job, enter Y.
echo.
call npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort --open
set "SERVER_RESULT=%ERRORLEVEL%"
if not "%SERVER_RESULT%"=="0" echo ERROR: The development server failed. Check the output above, including whether port 5173 is already in use.
popd
exit /b %SERVER_RESULT%
