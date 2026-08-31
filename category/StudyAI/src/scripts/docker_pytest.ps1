param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$PytestArgs
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$composeFile = Join-Path $root "docker-compose.yml"

if (-not $PytestArgs -or $PytestArgs.Count -eq 0) {
    $PytestArgs = @(
        "tests/systems/test_ai_learning_systems.py",
        "tests/systems/test_enterprise_ai_systems.py"
    )
}

docker compose -f $composeFile run --rm backend-test python -m pytest -q @PytestArgs

