$ErrorActionPreference = "Stop"

$nodeBin = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
$node = Join-Path $nodeBin "node.exe"
$pnpm = Join-Path $PSScriptRoot ".tools\pnpm\bin\pnpm.cjs"

if (-not (Test-Path $node)) {
  throw "Node runtime not found: $node"
}

if (-not (Test-Path $pnpm)) {
  throw "Local pnpm not found. Ask Codex to reinstall project dependencies."
}

$env:Path = "$nodeBin;$(Split-Path $pnpm);$env:Path"
& $node $pnpm --config.verify-deps-before-run=false test
