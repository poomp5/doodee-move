# ============================================================
# run-all.ps1 — รัน Load Test ทุก Scenario ตามลำดับ (Windows)
# ============================================================
# วิธีใช้:
#   .\load-tests\run-all.ps1
#   $env:BASE_URL="https://your-domain.com"; .\load-tests\run-all.ps1
# ============================================================

$ErrorActionPreference = "Stop"

# ตั้งค่า environment variables
$BASE_URL = if ($env:BASE_URL) { $env:BASE_URL } else { "http://localhost:3000" }
$RESULTS_DIR = "load-tests\results"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"

Write-Host "=============================================="
Write-Host "  doodee-move Load Test Suite"
Write-Host "  Base URL : $BASE_URL"
Write-Host "  Time     : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "=============================================="

# สร้าง results directory
if (-not (Test-Path $RESULTS_DIR)) {
    New-Item -ItemType Directory -Path $RESULTS_DIR | Out-Null
}

# ─── ตรวจสอบ k6 ───────────────────────────────────────────
try {
    $k6Version = k6 version 2>$null
    Write-Host "✅ k6 version: $k6Version"
} catch {
    Write-Host "❌ k6 ไม่ได้ติดตั้ง — ติดตั้งด้วย:" -ForegroundColor Red
    Write-Host "   choco install k6"
    Write-Host "   หรือ winget install k6 --source winget"
    exit 1
}
Write-Host ""

# ─── ตรวจสอบ server ────────────────────────────────────────
Write-Host "🔍 ตรวจสอบ server ที่ $BASE_URL ..."
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/api/webhook" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Host "✅ Server พร้อม"
} catch {
    Write-Host "⚠️  Server อาจยังไม่พร้อม — ดำเนินการต่อ..." -ForegroundColor Yellow
}
Write-Host ""

# ─── ฟังก์ชันสำหรับรัน scenario ────────────────────────────
function Run-Scenario {
    param(
        [string]$Name,
        [string]$File
    )
    
    $outputBase = "$RESULTS_DIR\${TIMESTAMP}_${Name}"
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Running: $Name" -ForegroundColor Cyan
    Write-Host "  File   : $File" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # รัน k6 และบันทึกผลลัพธ์
    $env:BASE_URL = $BASE_URL
    k6 run --out "json=$outputBase.json" $File
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $Name completed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ $Name failed with exit code $LASTEXITCODE" -ForegroundColor Red
    }
    Write-Host ""
}

# ─── รัน Test Scenarios ────────────────────────────────────
Write-Host "เริ่มรัน Load Test Scenarios..." -ForegroundColor Yellow
Write-Host ""

Run-Scenario -Name "01-baseline" -File "load-tests\scenarios\01-baseline.js"
Start-Sleep -Seconds 5

Run-Scenario -Name "02-normal-load" -File "load-tests\scenarios\02-normal-load.js"
Start-Sleep -Seconds 5

Run-Scenario -Name "03-spike" -File "load-tests\scenarios\03-spike.js"
Start-Sleep -Seconds 5

Run-Scenario -Name "04-soak" -File "load-tests\scenarios\04-soak.js"

# ─── สรุปผลลัพธ์ ────────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Load Test Suite Completed!" -ForegroundColor Green
Write-Host "  Results saved in: $RESULTS_DIR" -ForegroundColor Green
Write-Host "  Timestamp: $TIMESTAMP" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# แสดงรายการไฟล์ผลลัพธ์
Write-Host "Result files:" -ForegroundColor Cyan
Get-ChildItem -Path $RESULTS_DIR -Filter "${TIMESTAMP}_*" | 
    Format-Table Name, Length, LastWriteTime -AutoSize
