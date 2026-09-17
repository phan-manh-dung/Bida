param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$address = 'http://127.0.0.1:5173/'
function Test-Bida {
  try {
    $response = Invoke-WebRequest -Uri $address -UseBasicParsing -TimeoutSec 2
    return ($response.StatusCode -eq 200 -and $response.Content -match '<title>NOIR')
  } catch { return $false }
}
try {
  if (-not (Test-Bida)) {
    $node = (Get-Command node.exe -ErrorAction Stop).Source
    $vite = Join-Path $PSScriptRoot 'node_modules\vite\bin\vite.js'
    if (-not (Test-Path -LiteralPath $vite)) { throw 'Chua cai thu vien. Hay chay npm install trong thu muc Bida.' }
    $logDirectory = Join-Path $PSScriptRoot '.cache'
    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
    $server = Start-Process -FilePath $node -ArgumentList @(('"' + $vite + '"'), '--host', '127.0.0.1', '--port', '5173', '--strictPort') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDirectory 'server.log') -RedirectStandardError (Join-Path $logDirectory 'server-error.log') -PassThru
    $ready = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
      Start-Sleep -Milliseconds 300
      if (Test-Bida) { $ready = $true; break }
      if ($server.HasExited) { break }
    }
    if (-not $ready) { throw "Khong mo duoc web. Xem loi tai $logDirectory\server-error.log" }
  }
  Write-Output "Bida dang chay: $address"
  if (-not $NoBrowser) { Start-Process $address }
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}
