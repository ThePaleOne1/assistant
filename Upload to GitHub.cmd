@echo off
setlocal enabledelayedexpansion
rem UTF-8 console, so the dash in the version string prints properly
chcp 65001 >nul
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

rem ---- which version is this? --------------------------------------
set "VER=unknown"
for /f "tokens=2 delims='" %%V in ('findstr /c:"VERSION:" config.js') do set "VER=%%V"

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

rem ---- commit anything new -----------------------------------------
set "COMMITTED="
git diff --cached --quiet
if not errorlevel 1 goto :checkgithub

echo   Version: !VER!
echo.
echo   About to upload:
echo.
git diff --cached --name-status
echo.
set "MSG="
set /p "MSG=  Describe the change (or just press Enter):  "
if "!MSG!"=="" set "MSG=Update"
echo.
git commit -m "!MSG!" >nul || goto :fail
set "COMMITTED=1"

rem ---- is there anything GitHub doesn't have yet? ------------------
rem Asked every time, not only when there's something new to commit.
rem
rem The old version of this script only pushed straight after making a
rem commit. If that push failed - a GitHub sign-in window closed, the
rem wifi dropping - the commit sat on this computer alone, and every
rem later run said "nothing has changed" and never tried again. v1.6
rem sat stranded like that for a week. Comparing against GitHub itself
rem means a failed upload is always picked up by the next run.
:checkgithub
echo   Checking what GitHub has...
git fetch origin main >nul 2>&1
if errorlevel 1 goto :offline

set "AHEAD=0"
for /f %%N in ('git rev-list --count origin/main..HEAD') do set "AHEAD=%%N"
if "!AHEAD!"=="0" goto :uptodate

if not defined COMMITTED (
  echo.
  echo   Found !AHEAD! saved change^(s^) that never reached GitHub.
  echo   Version: !VER!
  echo   Uploading them now.
)
echo.

rem ---- bring in anything changed on GitHub, then push --------------
git pull --rebase origin main || goto :conflict
git push -u origin main || goto :pushfail

rem ---- make sure it actually landed ---------------------------------
git fetch origin main >nul 2>&1
set "AHEAD=0"
for /f %%N in ('git rev-list --count origin/main..HEAD') do set "AHEAD=%%N"
if not "!AHEAD!"=="0" goto :pushfail

echo.
echo   ==========================================
echo   Done. Version !VER! is on GitHub.
echo   GitHub Pages rebuilds in about a minute.
echo.
echo   %SITE%
echo.
echo   Then on each device: Settings, Check for updates.
echo.
pause
exit /b 0

:uptodate
echo.
echo   GitHub is already up to date. Version !VER! is live.
echo.
echo   If a device still shows an older version, open
echo   Settings on it and press Check for updates.
echo.
pause
exit /b 0

:offline
echo.
echo   Couldn't reach GitHub - check the internet connection.
if defined COMMITTED (
  echo.
  echo   Your change is saved on this computer. Run this again
  echo   once you're online and it will be uploaded then.
)
echo.
pause
exit /b 1

:pushfail
echo.
echo   ==========================================
echo   NOT UPLOADED.
echo.
echo   Your changes are saved on this computer, but they did not
echo   reach GitHub, so the live app has not changed.
echo.
echo   The usual cause is GitHub sign-in: a browser window or a
echo   sign-in box opened and was closed, or timed out. Read the
echo   message above for the exact reason.
echo.
echo   Just run this again - it will find the saved changes and
echo   try the upload again. Nothing will be lost.
echo.
pause
exit /b 1

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
