[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$strictUtf8 = New-Object System.Text.UTF8Encoding($false, $true)
$textExtensions = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
@(
    ".bat", ".cmd", ".css", ".html", ".js", ".json", ".md", ".mjs",
    ".ps1", ".py", ".sql", ".toml", ".ts", ".tsx", ".txt", ".yaml", ".yml"
) | ForEach-Object { [void]$textExtensions.Add($_) }

$legacyBomPaths = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
@(
    "category/StudyAI/.gitignore",
    "category/StudyAI/doc/detailed_design/system17_detailed_design.md",
    "category/StudyAI/doc/detailed_design/system18_detailed_design.md",
    "category/StudyAI/doc/detailed_design/system19_detailed_design.md",
    "category/StudyAI/doc/detailed_design/system20_detailed_design.md",
    "category/StudyAI/doc/detailed_design/system21_detailed_design.md",
    "category/StudyAI/doc/detailed_design/system22_detailed_design.md",
    "category/StudyAI/doc/detailed_design/system23_detailed_design.md",
    "category/StudyAI/doc/detailed_design/system24_detailed_design.md",
    "category/StudyAI/doc/detailed_design/system25_detailed_design.md",
    "category/StudyAI/doc/detailed_design/system26_detailed_design.md",
    "category/StudyAI/doc/detailed_design/system27_detailed_design.md",
    "category/StudyAI/doc/detailed_design/system28_detailed_design.md",
    "category/StudyAI/doc/detailed_design/system29_detailed_design.md",
    "category/StudyAI/doc/detailed_design/system30_detailed_design.md",
    "category/StudyAI/doc/detailed_design/system31_detailed_design.md",
    "category/StudyAI/doc/detailed_design/system32_detailed_design.md",
    "category/StudyAI/doc/detailed_design/system33_detailed_design.md",
    "category/StudyAI/doc/detailed_design/system34_detailed_design.md",
    "category/StudyAI/doc/detailed_design/system35_detailed_design.md",
    "category/StudyAI/doc/detailed_design/system36_detailed_design.md",
    "category/StudyAI/docker-compose.yml",
    "category/StudyAI/src/backend/Dockerfile",
    "category/StudyAI/src/backend/Dockerfile.test",
    "category/StudyAI/src/frontend/Dockerfile",
    "category/StudyAI/src/scripts/docker_pytest.ps1",
    "category/StudyAWS/src/infra/aws07_lambda_local_api/template.yaml",
    "category/StudyAWS/src/infra/aws08_api_gateway_lambda/template.yaml",
    "category/StudyWeb/.gitignore",
    "category/StudyWeb/src/infra/compose/web19_fetch_task_list/docker-compose.yml",
    "category/StudyWeb/src/infra/compose/web20_create_task_form/docker-compose.yml",
    "category/StudyWeb/src/infra/compose/web21_network_debug/docker-compose.yml",
    "category/StudyWeb/src/infra/compose/web22_tanstack_query/docker-compose.yml",
    "category/StudyWeb/src/infra/compose/web26_docker_compose_web_api_db/docker-compose.yml",
    "category/StudyWeb/src/infra/compose/web27_nginx_static_reverse_proxy/docker-compose.yml",
    "category/StudyWeb/src/infra/compose/web28_env_config/docker-compose.yml"
) | ForEach-Object { [void]$legacyBomPaths.Add($_) }

$errors = [System.Collections.Generic.List[string]]::new()
$checkedLegacyBomPaths = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
$validatedLegacyBomPaths = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)

Push-Location $repoRoot
try {
    $files = @(& git -c core.quotepath=false ls-files --cached --others --exclude-standard)
    if ($LASTEXITCODE -ne 0) {
        throw "git ls-files failed."
    }

    $textFiles = @($files | Where-Object {
        $fileName = [IO.Path]::GetFileName($_)
        $textExtensions.Contains([IO.Path]::GetExtension($_)) `
            -or $fileName -ieq ".gitignore" `
            -or $fileName -ilike "Dockerfile*"
    })

    $decoded = @{}
    foreach ($relativePath in $textFiles) {
        $absolutePath = Join-Path $repoRoot $relativePath
        try {
            $bytes = [IO.File]::ReadAllBytes($absolutePath)
            $decoded[$relativePath] = $strictUtf8.GetString($bytes)
            $hasBom = $bytes.Length -ge 3 `
                -and $bytes[0] -eq 239 `
                -and $bytes[1] -eq 187 `
                -and $bytes[2] -eq 191
            if ($legacyBomPaths.Contains($relativePath)) {
                [void]$checkedLegacyBomPaths.Add($relativePath)
                if ($hasBom) {
                    [void]$validatedLegacyBomPaths.Add($relativePath)
                }
                else {
                    $errors.Add("Preserved UTF-8 BOM is missing: $relativePath")
                }
            }
            elseif ($hasBom) {
                $errors.Add("Unexpected UTF-8 BOM: $relativePath")
            }
        }
        catch {
            $errors.Add("Invalid UTF-8: $relativePath")
        }
    }

    foreach ($legacyBomPath in $legacyBomPaths) {
        if (-not $checkedLegacyBomPaths.Contains($legacyBomPath)) {
            $errors.Add("Legacy UTF-8 BOM baseline path is missing: $legacyBomPath")
        }
    }

    $markdownFiles = @($textFiles | Where-Object { [IO.Path]::GetExtension($_) -ieq ".md" })
    $linkPattern = [regex]'!?(?:\[[^\]]*\])\((?<target>[^)\r\n]+)\)'

    foreach ($markdownFile in $markdownFiles) {
        if (-not $decoded.ContainsKey($markdownFile)) {
            continue
        }
        $baseDirectory = Split-Path -Parent (Join-Path $repoRoot $markdownFile)
        foreach ($match in $linkPattern.Matches($decoded[$markdownFile])) {
            $target = $match.Groups["target"].Value.Trim()
            if ($target.StartsWith("<") -and $target.Contains(">")) {
                $target = $target.Substring(1, $target.IndexOf(">") - 1)
            }
            else {
                $target = ($target -split '\s+["'']', 2)[0]
            }

            if (-not $target -or $target.StartsWith("#") -or $target.StartsWith("/") -or $target -match '^[A-Za-z][A-Za-z0-9+.-]*:') {
                continue
            }

            $target = ($target -split '#', 2)[0]
            $target = ($target -split '\?', 2)[0]
            if (-not $target) {
                continue
            }

            $target = [Uri]::UnescapeDataString($target).Replace("/", [IO.Path]::DirectorySeparatorChar)
            $resolved = [IO.Path]::GetFullPath((Join-Path $baseDirectory $target))
            if (-not (Test-Path -LiteralPath $resolved)) {
                $displayTarget = $match.Groups["target"].Value
                $errors.Add("Broken link: $markdownFile -> $displayTarget")
            }
        }
    }

    $requiredFiles = @(
        "LEARNING_GUIDE.md",
        "LEARNING_LOG_TEMPLATE.md",
        "THEME_CATALOG.md",
        "category/StudyWeb/doc/learning_notes/web01_static_first_page/README.md",
        "category/StudySecurity/doc/learning_notes/security01_session_auth/README.md",
        "category/StudyAI/doc/learning_notes/system03_project_document_qa/README.md"
    )
    foreach ($requiredFile in $requiredFiles) {
        if (-not (Test-Path -LiteralPath (Join-Path $repoRoot $requiredFile))) {
            $errors.Add("Missing learning entry: $requiredFile")
        }
    }

    $catalogPath = Join-Path $repoRoot "THEME_CATALOG.md"
    if (Test-Path -LiteralPath $catalogPath) {
        $catalog = $strictUtf8.GetString([IO.File]::ReadAllBytes($catalogPath))
        $topicPattern = [regex]'(?m)^- \[(?<id>(?:system|web|security|devops|aws|base|db|arch|desktop)\d{2})\b'
        $topicIds = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
        foreach ($match in $topicPattern.Matches($catalog)) {
            [void]$topicIds.Add($match.Groups["id"].Value)
        }
        if ($topicIds.Count -ne 163) {
            $errors.Add("Theme catalog count: expected 163, actual $($topicIds.Count)")
        }
    }

    Write-Host "Checked text files: $($textFiles.Count)"
    Write-Host "Checked Markdown files: $($markdownFiles.Count)"
    Write-Host "Validated legacy UTF-8 BOM files: $($validatedLegacyBomPaths.Count) / $($legacyBomPaths.Count)"

    if ($errors.Count -gt 0) {
        Write-Host "Errors: $($errors.Count)" -ForegroundColor Red
        foreach ($validationError in $errors) {
            Write-Host "- $validationError" -ForegroundColor Red
        }
        exit 1
    }

    Write-Host "Portfolio validation passed." -ForegroundColor Green
}
finally {
    Pop-Location
}
