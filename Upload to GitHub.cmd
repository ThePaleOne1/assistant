@echo off
setlocal enabledelayedexpansion
title Upload Assistant to GitHub
cd /d "%~dp0"

set "REPO=https://github.com/thepaleone1/assistant.git"
set "SITE=https://thepaleone1.github.io/assistant/"

echo.
echo   Uploading the Assistant app
echo   ==========================================
echo.

rem ---- is Git installed? -------------------------------------------
where git >nul 2>&1
if errorlevel 1 (
  echo   Git isn't installed on this computer yet.
  echo.
  echo   Get it from:  https://git-scm.com/download/win
  echo   Accept every default in the installer, then run this again.
  echo.
  pause
  exit /b 1
)

rem ---- first run: connect this folder to the repo ------------------
if not exist ".git" (
  echo   First run - connecting this folder to GitHub.
  echo   A browser window may open asking you to sign in to GitHub.
  echo.
  git init >nul || goto :fail
  git branch -M main >nul 2>&1
  git remote add origin "%REPO%" || goto :fail
  echo   Fetching what's already on GitHub...
  git fetch origin || goto :fail
  rem adopt the existing repo without touching any local file
  git reset --mixed origin/main >nul || goto :fail
  echo   Connected.
  echo.
)

rem ---- who is making the commit? ----------------------------------
rem Set once, for this folder only, so it doesn't touch any other
rem project on this machine. The @users.noreply.github.com address is
rem GitHub's own private one - it keeps your real email out of a public
rem repo, where every commit is visible. To use a different one:
rem     git config user.email "you@example.com"
git config user.email >nul 2>&1
if errorlevel 1 (
  git config user.name "thepaleone1"
  git config user.email "thepaleone1@users.noreply.github.com"
  echo   Set the commit name for this folder ^(private GitHub address^).
  echo.
)

rem ---- stage everything that isn't in .gitignore -------------------
git add -A || goto :fail

rem ---- safety net: never publish the private files -----------------
set "LEAK="
for /f "delims=" %%F in ('git diff --cached --name-only') do (
  echo %%F | findstr /i /c:"04_seed_timelog" /c:"Reference/" /c:"tools/" >nul && set "LEAK=%%F"
)
if defined LEAK (
  echo   STOPPED. This would publish a private file:
  echo.
  echo       !LEAK!
  echo.
  echo   That file holds your real job names and hours, and the repo
  echo   is public. Nothing has been uploaded.
  echo.
  echo   Check that .gitignore is still in this folder, then try again.
  git reset >nul
  pause
  exit /b 1
)

rem ---- anything to do? --------------------------------------------
git diff --cached --quiet
if not errorlevel 1 (
  echo   Nothing has changed since the last upload.
  echo.
  pause
  exit /b 0
)

echo   About to upload:
echo.
git diff --cached --name-status
echo.

set "MSG="
set /p "MSG=  Describe the change (or just press Enter):  "
if "!MSG!"=="" set "MSG=Update"

echo.
git commit -m "!MSG!" >nul || goto :fail

rem ---- bring in anything changed on GitHub, then push --------------
git pull --rebase origin main || goto :conflict
git push -u origin main || goto :fail

echo.
echo   ==========================================
echo   Done. GitHub Pages rebuilds in about a minute.
echo.
echo   %SITE%
echo.
echo   Then reload the app on each device. Check the version
echo   at the bottom of Settings to confirm it arrived.
echo.
pause
exit /b 0

:conflict
echo.
echo   The copy on GitHub has changes this computer doesn't have,
echo   and they clash with yours. Nothing has been uploaded.
echo.
echo   Easiest fix: tell Claude, and paste in the message above.
echo.
pause
exit /b 1

:fail
echo.
echo   Something went wrong - the message above says what.
echo   Nothing has been uploaded.
echo.
pause
exit /b 1
