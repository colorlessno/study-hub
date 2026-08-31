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

$errors = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()

Push-Location $repoRoot
try {
    $files = @(& git -c core.quotepath=false ls-files --cached --others --exclude-standard)
    if ($LASTEXITCODE -ne 0) {
        throw "git ls-files failed."
    }

    $textFiles = @($files | Where-Object {
        $textExtensions.Contains([IO.Path]::GetExtension($_))
    })

    $decoded = @{}
    foreach ($relativePath in $textFiles) {
        $absolutePath = Join-Path $repoRoot $relativePath
        try {
            $bytes = [IO.File]::ReadAllBytes($absolutePath)
            $decoded[$relativePath] = $strictUtf8.GetString($bytes)
            if ($bytes.Length -ge 3 -and $bytes[0] -eq 239 -and $bytes[1] -eq 187 -and $bytes[2] -eq 191) {
                $warnings.Add("UTF-8 BOM: $relativePath")
            }
        }
        catch {
            $errors.Add("Invalid UTF-8: $relativePath")
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
    Write-Host "Warnings: $($warnings.Count)"
    foreach ($warning in $warnings) {
        Write-Warning $warning
    }

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
