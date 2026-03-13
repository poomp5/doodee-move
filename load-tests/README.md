# Load Tests for Webhook Endpoint

## Overview
This load test suite tests the `/api/webhook` endpoint with various LINE webhook event types including:
- Text messages
- Location messages
- Follow events
- Multiple events in a single webhook call

## 🧪 Special Test: Response Time Test (HCI Performance)

**วัตถุประสงค์**: ทดสอบประสิทธิภาพด้านความเร็วในการตอบสนองตามหลักการ Human-Computer Interaction (HCI)

**สมมติฐาน**: ระบบ Doodee Move สามารถประมวลผลและตอบกลับข้อมูลเส้นทางได้ภายในระยะเวลาเฉลี่ยไม่เกิน 2 วินาที

### Test Design:
- **10 เส้นทาง** (จากจุดต่างๆ ในกรุงเทพฯ)
- **100 iterations** ต่อเส้นทาง
- **รวม 1000 requests**
- วัดค่า **Average Response Time** และ **Maximum Response Time**

### วิธีรัน Response Time Test:
```powershell
# Windows PowerShell
.\load-tests\run-response-time-test.ps1

# หรือใช้ k6 โดยตรง
k6 run load-tests/response-time-test.js
```

### การอ่านผลลัพธ์:
- ผลลัพธ์จะบันทึกใน `response-time-results.json`
- แสดงสถิติแยกตามแต่ละเส้นทาง
- วิเคราะห์ว่าสมมติฐาน (avg < 2s) เป็นจริงหรือไม่
- แสดง min, max, average, P95 ของแต่ละเส้นทาง

---

## 🧪 Test 2: System Stability Test (Reliability Testing)

**วัตถุประสงค์**: ทดสอบความเสถียรของระบบภายใต้การใช้งานพร้อมกัน (Concurrent Load)

**หลักการ**: Software Reliability Testing - วัดความสามารถในการคงสภาพการทำงานภายใต้แรงกดดันจากการใช้งานพร้อมกัน

### Test Design:
- **10 Concurrent Users** (ผู้ใช้พร้อมกัน)
- **ระยะเวลา**: 10 นาที
- **เป้าหมาย**: ระบบไม่ล่ม (No Crashes)
- **Success Rate**: ≥ 95%
- ตรวจสอบ: Error rate, Timeout rate, System crashes

### วิธีรัน Stability Test:
```powershell
# Windows PowerShell
k6 run load-tests/stability-test.js

# หรือบันทึกผลลัพธ์
k6 run --out json=results/stability-test.json load-tests/stability-test.js
```

### การอ่านผลลัพธ์:
- ผลลัพธ์จะบันทึกใน `stability-test-results.json`
- แสดง Success Rate, Error Rate, System Crashes
- วิเคราะห์ความเสถียร: STABLE หรือ UNSTABLE
- แสดงสถิติ Response Time ภายใต้ Concurrent Load

---

## Prerequisites

### 1. Install k6
- **Windows**: Download from [k6.io](https://k6.io/docs/get-started/installation/)
  ```powershell
  choco install k6
  # or
  winget install k6 --source winget
  ```
- **macOS**: `brew install k6`
- **Linux**: `sudo apt-get install k6`

### 2. Set Environment Variables
The tests use the LINE Channel Secret to generate webhook signatures. Set it before running:

```bash
# Windows PowerShell
$env:LINE_CHANNEL_SECRET="your_line_channel_secret_here"
$env:BASE_URL="http://localhost:3000"

# bash/zsh
export LINE_CHANNEL_SECRET="your_line_channel_secret_here"
export BASE_URL="http://localhost:3000"
```

If you don't set `LINE_CHANNEL_SECRET`, it will use `"default_test_secret"`.

## Running Tests

### Run Individual Scenarios

#### 1. Baseline Test (1 user, 30 seconds)
```bash
k6 run load-tests/scenarios/01-baseline.js
```

#### 2. Normal Load Test (0→20 users)
```bash
k6 run load-tests/scenarios/02-normal-load.js
```

#### 3. Spike Test (sudden 0→20 users)
```bash
k6 run load-tests/scenarios/03-spike.js
```

#### 4. Soak Test (10 users for 5 minutes)
```bash
k6 run load-tests/scenarios/04-soak.js
```

### Run Full Test Suite
```bash
# Windows PowerShell
cd load-tests
bash run-all.sh

# bash/zsh
./load-tests/run-all.sh
```

### Run Complete Test with All Scenarios
```bash
k6 run load-tests/k6-full-test.js
```

## Test Results

Results will be saved in `load-tests/results/` directory with timestamps.

### Export Results
```bash
# JSON format
k6 run --out json=results/output.json load-tests/k6-full-test.js

# CSV format
k6 run --out csv=results/output.csv load-tests/k6-full-test.js
```

## Understanding the Results

### Key Metrics
- **http_req_duration**: Response time for all requests
  - p(95): 95th percentile - 95% of requests faster than this
  - p(99): 99th percentile - 99% of requests faster than this
  
- **webhook_post_duration**: Time for webhook POST requests
- **webhook_text_duration**: Time for text message webhooks
- **webhook_location_duration**: Time for location message webhooks

- **http_req_failed**: Request failure rate (should be < 1%)
- **success_rate**: Overall success rate (should be > 99%)

### Thresholds
Tests will pass/fail based on:
- Response time under 800ms (p95)
- Error rate under 1%
- Success rate over 99%

## Notes

- Tests accept both HTTP 200 (success) and HTTP 401 (invalid signature) as valid responses
- The 401 responses occur when the LINE_CHANNEL_SECRET doesn't match your server's secret
- For accurate testing, use your actual LINE_CHANNEL_SECRET
- Tests generate random user IDs to simulate multiple users
- Location events use random coordinates around Bangkok (13.75°N, 100.50°E)

## Troubleshooting

### "k6 not found"
Install k6 using the commands in Prerequisites section.

### Server not responding
Make sure your Next.js server is running:
```bash
npm run dev
# or
npm run build && npm start
```

### All requests getting 401
Your LINE_CHANNEL_SECRET environment variable doesn't match the server's secret. Either:
1. Set the correct secret: `export LINE_CHANNEL_SECRET="your_actual_secret"`
2. The tests still work - they measure response time regardless of 200 vs 401

### Tests are slow
The webhook endpoint may call external APIs (LINE, Google Maps, etc). This is expected behavior. The tests measure real-world performance.
