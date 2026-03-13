# ============================================================
# Run Response Time Test (HCI Performance Testing)
# ============================================================
# การทดสอบประสิทธิภาพด้านความเร็วในการตอบสนอง
# ตามหลักการ Human-Computer Interaction (HCI)
# 
# สมมติฐาน: ระบบตอบสนองได้เฉลี่ยไม่เกิน 2 วินาที
# ============================================================

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$OutputDir = "load-tests\results"
)

$ErrorActionPreference = "Stop"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   🧪 Response Time Test - Doodee Move" -ForegroundColor Cyan
Write-Host "   Human-Computer Interaction (HCI) Performance Analysis" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test Configuration:" -ForegroundColor Yellow
Write-Host "   Base URL: $BaseUrl"
Write-Host "   Routes: 10 routes"
Write-Host "   Iterations: 100 per route"
Write-Host "   Total Requests: 1000"
Write-Host "   Hypothesis: Avg response time under 2 seconds"
Write-Host "   Method: Sequential testing"
Write-Host ""

# ตรวจสอบ k6
try {
    $k6Version = k6 version 2>$null
    Write-Host "✅ k6 installed: $k6Version" -ForegroundColor Green
} catch {
    Write-Host "❌ k6 not installed. Install with:" -ForegroundColor Red
    Write-Host "   winget install k6 --source winget"
    exit 1
}

# ตรวจสอบ server
Write-Host ""
Write-Host "🔍 Checking server at $BaseUrl..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Host "✅ Server is running" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Warning: Server may not be running" -ForegroundColor Yellow
    Write-Host "   Make sure to start with: npm run dev"
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 0
    }
}

# สร้าง results directory
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "   🚀 Starting Test..." -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📊 This will test:" -ForegroundColor Cyan
Write-Host "   1. จุฬาฯ ไปสยาม"
Write-Host "   2. จุฬาฯ ไปโรงเรียนอัสสัมชัญธนบุรี"
Write-Host "   3. สยาม ไป มหาวิทยาลัยธรรมศาสตร์"
Write-Host "   4. สนามหลวง ไป เซ็นทรัลเวิลด์"
Write-Host "   5. อนุสาวรีย์ชัยสมรภูมิ ไป ตลาดน้ำดอนหวาย"
Write-Host "   6. สุขุมวิท ไป รามอินทรา"
Write-Host "   7. บางซื่อ ไป ลาดพร้าว"
Write-Host "   8. แจ้งวัฒนะ ไป สนามกีฬาแห่งชาติ"
Write-Host "   9. สาทร ไป ซอยอารีย์"
Write-Host "  10. เอกมัย ไป พญาไท"
Write-Host ""
Write-Host "Expected duration: ~25-50 minutes" -ForegroundColor Yellow
Write-Host "   (Each route tested 100 times with 1s interval)"
Write-Host ""
Write-Host "Note:" -ForegroundColor Cyan
Write-Host "   - The test measures response time regardless of authentication status"
Write-Host "   - Both HTTP 200 (success) and 401 (auth failed) are counted"
Write-Host "   - 401 responses still measure server response performance"
Write-Host ""

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outputFile = "$OutputDir\response-time-$timestamp.json"

# รัน test
$env:BASE_URL = $BaseUrl
k6 run --out "json=$outputFile" "load-tests\response-time-test.js"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "   ✅ Test Completed Successfully!" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "📁 Results saved to:" -ForegroundColor Cyan
    Write-Host "   - $outputFile"
    Write-Host "   - response-time-results.json"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host "   ❌ Test Failed" -ForegroundColor Red
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host ""
}

# แสดงไฟล์ผลลัพธ์
if (Test-Path "response-time-results.json") {
    Write-Host "📊 Analysis Results:" -ForegroundColor Cyan
    Write-Host ""
    $results = Get-Content "response-time-results.json" | ConvertFrom-Json
    Write-Host "   Timestamp: $($results.timestamp)"
    Write-Host "   Hypothesis: $($results.hypothesis)"
    Write-Host ""
}

Write-Host "Tip: Open response-time-results.json for detailed analysis" -ForegroundColor Yellow
Write-Host ""
