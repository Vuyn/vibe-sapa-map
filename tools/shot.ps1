# Renders the map in headless Edge and saves PNG screenshots, so changes can be checked without opening a browser.
# Usage, from inside PowerShell:  & .\shot.ps1 -Html ..\index.html -Out .\shots -Views "town=#h=14&m=9&z=5&at=406,199&sky=1","night=#h=23.5&z=12&at=412,196&sky=1"
# (through "powershell -File" a list of several views arrives as one garbled view; a single view works either way)
# View settings go in the address after #: h hour, m month, z zoom 1-48 (22 and up is the close-up tier), at centre tile x,y, sel place id, tab place|list|settings|about, lang en|vi, sky 0 auto 1 clear 2 fog 3 rain.
param([string]$Html, [string]$Out, [string[]]$Views, [int]$Width = 1900, [int]$Height = 1000, [int]$Budget = 15000)
$edge = @("C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe", "C:\Program Files\Microsoft\Edge\Application\msedge.exe", "C:\Program Files\Google\Chrome\Application\chrome.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { throw 'No Edge or Chrome found' }
$Html = (Resolve-Path $Html).Path
New-Item -ItemType Directory -Force $Out | Out-Null
$Out = (Resolve-Path $Out).Path
$profile = Join-Path $env:TEMP 'sapa-shot-profile'
foreach ($v in $Views) {
  $name, $hash = $v -split '=', 2
  # headless time runs ahead of a background worker, so screenshots build the land on the main thread
  if ($hash) { $hash = "$hash&worker=0" } else { $hash = '#worker=0' }
  $png = Join-Path $Out "$name.png"
  Remove-Item $png -ErrorAction SilentlyContinue
  # paths may contain spaces: encode them in the address and quote the file arguments
  $url = 'file:///' + (($Html -replace '\\', '/') -replace ' ', '%20') + $hash
  $a = @('--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', "--user-data-dir=`"$profile`"", "--window-size=$Width,$Height", "--virtual-time-budget=$Budget", "--screenshot=`"$png`"", "`"$url`"")
  $pr = Start-Process -FilePath $edge -ArgumentList $a -PassThru -WindowStyle Hidden
  if (-not $pr.WaitForExit(90000)) { $pr.Kill(); Write-Host "TIMEOUT $name" }
  if (Test-Path $png) { Write-Host "$name.png $((Get-Item $png).Length) bytes" } else { Write-Host "FAILED $name" }
}
