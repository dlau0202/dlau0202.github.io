# Usage: ./new-post.ps1 -Title "My Post" -Tags "tag1,tag2" -Layout "post" [-Author "Your Name"]
param(
  [Parameter(Mandatory=$true)] [string]$Title,
  [string]$Tags = "",
  [string]$Layout = "post",
  [string]$Author
)

# Normalize title to filename-safe (basic)
$slug = $Title -replace "\s+", "-" -replace "[^\p{L}0-9_-]", "" | ForEach-Object { $_.ToLower() }

# Beijing time (robust across Windows/IANA)
$tz = $null
try { $tz = [System.TimeZoneInfo]::FindSystemTimeZoneById('China Standard Time') } catch {
  try { $tz = [System.TimeZoneInfo]::FindSystemTimeZoneById('Asia/Shanghai') } catch { $tz = [System.TimeZoneInfo]::Local }
}
$now = [System.TimeZoneInfo]::ConvertTime([DateTimeOffset]::UtcNow, $tz)
$datestr = $now.ToString('yyyy-MM-dd HH:mm:ss K')
$ymd = $now.ToString('yyyy-MM-dd')

$DefaultAuthor = [string]::Concat([char]0x516D,[char]0x7B49,[char]0x661F) # 六等星
if ([string]::IsNullOrWhiteSpace($Author)) { $Author = $DefaultAuthor }

$frontMatter = @"
---
layout: $Layout
title: "$Title"
author: "$Author"
date: $datestr
tags: [$Tags]
---

"@

$dir = Join-Path $PSScriptRoot "_posts"
if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

$filePath = Join-Path $dir ("$ymd-" + $slug + ".md")
Set-Content -Path $filePath -Value $frontMatter -Encoding UTF8

Write-Host "Created: $filePath"
