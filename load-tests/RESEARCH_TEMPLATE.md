# แบบฟอร์มรายงานผลการทดสอบสมรรถนะ (Performance Testing Report)

## ข้อมูลทั่วไป

| รายการ | รายละเอียด |
|--------|-----------|
| ชื่อระบบ | doodee-move (LINE Chatbot สำหรับระบบขนส่งสาธารณะ) |
| เวอร์ชัน | - |
| วันที่ทดสอบ | [วว/ดด/ปปปป] |
| ผู้ทดสอบ | - |
| เครื่องมือ | k6 v[x.x.x] |
| Base URL | [URL ที่ทดสอบ] |

---

## สภาพแวดล้อมการทดสอบ

### Server
| รายการ | ค่า |
|--------|-----|
| Cloud Provider | - |
| Instance Type | - |
| CPU | - |
| RAM | - |
| OS | - |
| Node.js | - |
| PostgreSQL | - |

### Client (เครื่องทดสอบ)
| รายการ | ค่า |
|--------|-----|
| OS | macOS [version] |
| CPU | - |
| RAM | - |
| Network | [WiFi/LAN/Fiber] |

---

## API Endpoints ที่ทดสอบ

| Endpoint | Method | คำอธิบาย |
|----------|--------|---------|
| `/api/rating` | GET | ดึงสถิติคะแนน |
| `/api/rating` | POST | บันทึกคะแนน |
| `/api/admin/submissions` | GET | ดึงรายการ submissions |

---

## Scenario 1: Baseline Test

**วัตถุประสงค์:** วัด response time พื้นฐานด้วยผู้ใช้ 1 คน เพื่อใช้เป็น reference

**การตั้งค่า:**
- Virtual Users: 1
- Duration: 30 วินาที

### ผลการทดสอบ

| Metric | ค่าที่วัดได้ | เกณฑ์ |
|--------|------------|-------|
| Avg Response Time | __ ms | < 300 ms |
| P95 Response Time | __ ms | < 300 ms |
| P99 Response Time | __ ms | - |
| Max Response Time | __ ms | - |
| Total Requests | __ | - |
| Error Rate | __%  | < 1% |

**ผลการวิเคราะห์:** [กรอกข้อมูล]

---

## Scenario 2: Normal Load Test (20 Concurrent Users)

**วัตถุประสงค์:** ทดสอบการทำงานภายใต้โหลดปกติที่ผู้ใช้ 20 คนเข้าพร้อมกัน

**การตั้งค่า:**
- Ramp-up: 0 → 20 users ใน 10 วินาที
- Sustain: 20 users นาน 60 วินาที
- Ramp-down: 20 → 0 ใน 10 วินาที

### ผลการทดสอบรวม (All Endpoints)

| Metric | ค่าที่วัดได้ | เกณฑ์ | ผ่าน/ไม่ผ่าน |
|--------|------------|-------|------------|
| Avg Response Time | __ ms | < 300 ms | ✅/❌ |
| P90 Response Time | __ ms | < 400 ms | ✅/❌ |
| P95 Response Time | __ ms | < 500 ms | ✅/❌ |
| P99 Response Time | __ ms | < 1000 ms | ✅/❌ |
| Max Response Time | __ ms | - | - |
| Throughput | __ req/s | > 5 req/s | ✅/❌ |
| Total Requests | __ | - | - |
| Error Rate | __% | < 1% | ✅/❌ |
| Success Rate | __% | > 99% | ✅/❌ |

### ผลการทดสอบแยกตาม Endpoint

#### GET /api/rating
| Metric | ค่า |
|--------|-----|
| Avg | __ ms |
| P95 | __ ms |
| Error Rate | __% |

#### POST /api/rating
| Metric | ค่า |
|--------|-----|
| Avg | __ ms |
| P95 | __ ms |
| Error Rate | __% |

#### GET /api/admin/submissions
| Metric | ค่า |
|--------|-----|
| Avg | __ ms |
| P95 | __ ms |
| Error Rate | __% |

### Network Timing Breakdown (Avg)
| ขั้นตอน | ค่าที่วัดได้ |
|--------|------------|
| DNS Lookup | __ ms |
| TCP Connect | __ ms |
| Waiting (TTFB) | __ ms |
| Receiving | __ ms |

**ผลการวิเคราะห์:** [กรอกข้อมูล]

---

## Scenario 3: Spike Test

**วัตถุประสงค์:** ทดสอบการรับมือกับ traffic ที่เพิ่มขึ้นทันทีอย่างรวดเร็ว

**การตั้งค่า:**
- Ramp-up: 0 → 20 users ใน 2 วินาที (spike)
- Sustain: 30 วินาที
- Ramp-down: 5 วินาที

| Metric | ค่าที่วัดได้ | เกณฑ์ | ผ่าน/ไม่ผ่าน |
|--------|------------|-------|------------|
| P95 Response Time | __ ms | < 1000 ms | ✅/❌ |
| Error Rate | __% | < 5% | ✅/❌ |
| Max Response Time | __ ms | - | - |

**ผลการวิเคราะห์:** [กรอกข้อมูล]

---

## Scenario 4: Soak Test

**วัตถุประสงค์:** ตรวจสอบความเสถียรระยะยาว ค้นหา memory leak หรือการเสื่อมประสิทธิภาพเมื่อเวลาผ่านไป

**การตั้งค่า:**
- Virtual Users: 10 คน
- Duration: 5 นาที

| ช่วงเวลา | Avg Response Time | Error Rate |
|---------|------------------|-----------|
| 0-1 min | __ ms | __% |
| 1-2 min | __ ms | __% |
| 2-3 min | __ ms | __% |
| 3-4 min | __ ms | __% |
| 4-5 min | __ ms | __% |

**ผลการวิเคราะห์:** [กรอกข้อมูล - ดู trend ว่า response time เพิ่มขึ้นหรือไม่]

---

## สรุปผลการทดสอบทั้งหมด

| Scenario | ผลลัพธ์ | หมายเหตุ |
|----------|--------|---------|
| Baseline (1 user) | ✅/❌ | - |
| Normal Load (20 users) | ✅/❌ | - |
| Spike Test | ✅/❌ | - |
| Soak Test (5 min) | ✅/❌ | - |

---

## การเปรียบเทียบ Baseline vs Load

| Metric | Baseline (1 user) | Normal Load (20 users) | เพิ่มขึ้น |
|--------|------------------|----------------------|---------|
| Avg Response Time | __ ms | __ ms | __%  |
| P95 Response Time | __ ms | __ ms | __%  |
| Error Rate | __% | __% | - |

---

## ข้อสรุปและข้อเสนอแนะ

### ข้อสรุป
[กรอกข้อมูล]

### จุดที่ต้องปรับปรุง (ถ้ามี)
1. [กรอกข้อมูล]
2. [กรอกข้อมูล]

### ข้อเสนอแนะ
[กรอกข้อมูล]

---

*รายงานนี้สร้างจากการทดสอบด้วย k6 Load Testing Tool*
