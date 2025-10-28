@echo off
REM Setup script for code quality tools (Windows)
echo Setting up Code Quality Tools...

REM Install dependencies
echo Installing dependencies...
call npm install

REM Setup Husky
echo Setting up Husky git hooks...
call npm run prepare

REM Run initial format
echo Formatting codebase...
call npm run format

REM Run lint check
echo Running lint check...
call npm run lint

REM Type check
echo Type checking...
call npm run type-check

echo.
echo Setup complete!
echo.
echo Available commands:
echo   npm run lint          - Check for linting issues
echo   npm run lint:fix      - Fix linting issues
echo   npm run format        - Format all files
echo   npm run format:check  - Check formatting
echo   npm run type-check    - Type check all workspaces
echo.
echo Git hooks configured:
echo   pre-commit  - Lint and format staged files
echo   pre-push    - Type check before push
echo.
pause
