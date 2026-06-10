@echo off
setlocal
set "NODE_BIN=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
set "NODE=%NODE_BIN%\node.exe"
set "PNPM=%~dp0.tools\pnpm\bin\pnpm.cjs"
if not exist "%NODE%" (
  echo Node runtime not found: "%NODE%"
  exit /b 1
)
if not exist "%PNPM%" (
  echo Local pnpm not found. Ask Codex to reinstall project dependencies.
  exit /b 1
)
set "PATH=%NODE_BIN%;%~dp0.tools\pnpm\bin;%PATH%"
"%NODE%" "%PNPM%" --config.verify-deps-before-run=false build
