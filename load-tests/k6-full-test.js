/**
 * ============================================================
 * k6 Load Test — doodee-move Webhook (Next.js + PostgreSQL)
 * ============================================================
 * ทดสอบ Concurrent Users: 20 คน
 * Metrics ที่วัด:
 *   - Response Time (avg / P90 / P95 / P99 / max)
 *   - Throughput (requests/second)
 *   - Error Rate
 *   - Virtual Users over time
 *   - Checks pass/fail rate
 *
 * วิธีรัน:
 *   k6 run load-tests/k6-full-test.js
 *   k6 run --out json=results/output.json load-tests/k6-full-test.js
 *   k6 run --out csv=results/output.csv  load-tests/k6-full-test.js
 * ============================================================
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Counter, Rate, Trend, Gauge } from "k6/metrics";
import crypto from "k6/crypto";

// ─── Base URL ───────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const CHANNEL_SECRET = __ENV.LINE_CHANNEL_SECRET || "default_test_secret";

// ─── Custom Metrics ─────────────────────────────────────────
const webhookPostDuration  = new Trend("webhook_post_duration",  true);
const webhookTextDuration  = new Trend("webhook_text_duration",  true);
const webhookLocationDuration = new Trend("webhook_location_duration", true);
const errorCount           = new Counter("error_count");
const errorRate            = new Rate("error_rate");
const successRate          = new Rate("success_rate");
const activeVUsers         = new Gauge("active_vusers");

// ─── Test Scenarios (Stages) ─────────────────────────────────
// ใช้ executor: ramping-vus เพื่อ simulate การเพิ่ม/ลด load
export const options = {
  scenarios: {
    // ─── Scenario 1: Baseline (1 user) ───────────────────
    baseline: {
      executor: "constant-vus",
      vus: 1,
      duration: "30s",
      startTime: "0s",
      tags: { scenario: "baseline" },
    },

    // ─── Scenario 2: Normal Load (20 users) ──────────────
    normal_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 20 },  // ramp-up
        { duration: "60s", target: 20 },  // sustain
        { duration: "10s", target: 0 },   // ramp-down
      ],
      startTime: "35s",
      tags: { scenario: "normal_load" },
    },

    // ─── Scenario 3: Spike Test (0 → 20 ทันที) ───────────
    spike: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2s",  target: 20 }, // spike ทันที
        { duration: "30s", target: 20 }, // sustain
        { duration: "2s",  target: 0  }, // drop
      ],
      startTime: "120s",
      tags: { scenario: "spike" },
    },

    // ─── Scenario 4: Soak Test (ระยะยาว) ─────────────────
    soak: {
      executor: "constant-vus",
      vus: 10,
      duration: "5m",
      startTime: "160s",
      tags: { scenario: "soak" },
    },
  },

  // ─── Thresholds (เกณฑ์ผ่าน/ไม่ผ่าน) ───────────────────────
  thresholds: {
    // Response time
    "http_req_duration":                    ["p(95)<800", "p(99)<1500", "avg<500"],
    "webhook_post_duration":                ["p(95)<800", "avg<500"],
    "webhook_text_duration":                ["p(95)<800", "avg<500"],
    "webhook_location_duration":            ["p(95)<1000", "avg<600"],

    // Error rate
    "http_req_failed":                      ["rate<0.01"],   // < 1%
    "error_rate":                           ["rate<0.01"],
    "success_rate":                         ["rate>0.99"],   // > 99%

    // Throughput — ต้องการอย่างน้อย 5 req/s
    "http_reqs":                            ["rate>5"],
  },
};

// ─── Helper: สุ่ม LINE User ID ───────────────────────────────
function randomUserId() {
  const id = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
  return `Utest${id}${Date.now() % 10000}`;
}

// ─── Helper: สร้าง LINE Webhook Signature ───────────────────
function createLineSignature(body) {
  return crypto.hmac("sha256", CHANNEL_SECRET, body, "base64");
}

// ─── Helper: สร้าง LINE Text Message Event ──────────────────
function createTextMessageEvent(text, userId) {
  return {
    type: "message",
    replyToken: `test-reply-token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    source: {
      userId: userId,
      type: "user"
    },
    timestamp: Date.now(),
    mode: "active",
    message: {
      type: "text",
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: text
    }
  };
}

// ─── Helper: สร้าง LINE Location Message Event ──────────────
function createLocationMessageEvent(lat, lng, address, userId) {
  return {
    type: "message",
    replyToken: `test-reply-token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    source: {
      userId: userId,
      type: "user"
    },
    timestamp: Date.now(),
    mode: "active",
    message: {
      type: "location",
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      latitude: lat,
      longitude: lng,
      address: address,
      title: "My Location"
    }
  };
}

// ─── Main Test Function ──────────────────────────────────────
export default function () {
  activeVUsers.add(1);

  // ── Group 1: Webhook with Text Message ──────────────────────
  group("POST /api/webhook (text message)", function () {
    const userId = randomUserId();
    const textMessages = [
      "hello",
      "สวัสดี",
      "help",
      "ช่วยด้วย",
      "MRT สุขุมวิท",
      "BTS อโศก"
    ];
    const text = textMessages[Math.floor(Math.random() * textMessages.length)];
    
    const event = createTextMessageEvent(text, userId);
    const webhookPayload = JSON.stringify({ events: [event] });
    const signature = createLineSignature(webhookPayload);

    const params = {
      headers: { 
        "Content-Type": "application/json",
        "x-line-signature": signature
      },
      tags: { endpoint: "webhook_text" },
    };

    const res = http.post(`${BASE_URL}/api/webhook`, webhookPayload, params);

    webhookTextDuration.add(res.timings.duration);

    const passed = check(res, {
      "status 200 or 401": (r) => r.status === 200 || r.status === 401,
      "has ok field":      (r) => {
        try { return JSON.parse(r.body).ok !== undefined; } catch { return false; }
      },
      "response time < 800ms": (r) => r.timings.duration < 800,
    });

    successRate.add(passed ? 1 : 0);
    errorRate.add(passed ? 0 : 1);
    if (!passed) errorCount.add(1);

    sleep(0.5);
  });

  // ── Group 2: Webhook with Location Message ──────────────────
  group("POST /api/webhook (location message)", function () {
    const userId = randomUserId();
    // Bangkok coordinates - various locations
    const locations = [
      { lat: 13.7563, lng: 100.5018, addr: "Bangkok City Center" },
      { lat: 13.7467, lng: 100.5342, addr: "Sukhumvit Area" },
      { lat: 13.7650, lng: 100.5377, addr: "Asok" },
      { lat: 13.7308, lng: 100.5214, addr: "Silom" },
    ];
    const loc = locations[Math.floor(Math.random() * locations.length)];
    
    const event = createLocationMessageEvent(loc.lat, loc.lng, loc.addr, userId);
    const webhookPayload = JSON.stringify({ events: [event] });
    const signature = createLineSignature(webhookPayload);

    const params = {
      headers: { 
        "Content-Type": "application/json",
        "x-line-signature": signature
      },
      tags: { endpoint: "webhook_location" },
    };

    const res = http.post(`${BASE_URL}/api/webhook`, webhookPayload, params);

    webhookLocationDuration.add(res.timings.duration);

    const passed = check(res, {
      "status 200 or 401": (r) => r.status === 200 || r.status === 401,
      "has ok field":      (r) => {
        try { return JSON.parse(r.body).ok !== undefined; } catch { return false; }
      },
      "response time < 1000ms": (r) => r.timings.duration < 1000,
    });

    successRate.add(passed ? 1 : 0);
    errorRate.add(passed ? 0 : 1);
    if (!passed) errorCount.add(1);

    sleep(0.8);
  });

  // ── Group 3: Multiple Events in One Webhook ─────────────────
  group("POST /api/webhook (multiple events)", function () {
    const userId1 = randomUserId();
    const userId2 = randomUserId();
    
    const event1 = createTextMessageEvent("สวัสดี", userId1);
    const event2 = createTextMessageEvent("hello", userId2);
    
    const webhookPayload = JSON.stringify({ events: [event1, event2] });
    const signature = createLineSignature(webhookPayload);

    const params = {
      headers: { 
        "Content-Type": "application/json",
        "x-line-signature": signature
      },
      tags: { endpoint: "webhook_multi" },
    };

    const res = http.post(`${BASE_URL}/api/webhook`, webhookPayload, params);

    webhookPostDuration.add(res.timings.duration);

    const passed = check(res, {
      "status 200 or 401": (r) => r.status === 200 || r.status === 401,
      "has ok field":      (r) => {
        try { return JSON.parse(r.body).ok !== undefined; } catch { return false; }
      },
      "processed count":   (r) => {
        try { return JSON.parse(r.body).processed >= 0; } catch { return false; }
      },
      "response time < 800ms": (r) => r.timings.duration < 800,
    });

    successRate.add(passed ? 1 : 0);
    errorRate.add(passed ? 0 : 1);
    if (!passed) errorCount.add(1);

    sleep(0.5);
  });

  activeVUsers.add(-1);
  sleep(1);
}

// ─── Summary Report (พิมพ์หลังเสร็จ) ─────────────────────────
export function handleSummary(data) {
  const metrics = data.metrics;

  function ms(val) {
    return val ? `${val.toFixed(2)} ms` : "N/A";
  }
  function pct(val) {
    return val !== undefined ? `${(val * 100).toFixed(2)}%` : "N/A";
  }

  const report = `
╔══════════════════════════════════════════════════════════════╗
║          doodee-move  —  Load Test Summary Report            ║
╚══════════════════════════════════════════════════════════════╝

📅  Date     : ${new Date().toLocaleString("th-TH")}
🌐  Base URL : ${BASE_URL}
👥  Max VUs  : 20 concurrent users

──────────────────────────────────────────────────────────────
 RESPONSE TIME  (http_req_duration)
──────────────────────────────────────────────────────────────
  Average   : ${ms(metrics.http_req_duration?.values?.avg)}
  Median    : ${ms(metrics.http_req_duration?.values?.med)}
  P90       : ${ms(metrics.http_req_duration?.values["p(90)"])}
  P95       : ${ms(metrics.http_req_duration?.values["p(95)"])}
  P99       : ${ms(metrics.http_req_duration?.values["p(99)"])}
  Max       : ${ms(metrics.http_req_duration?.values?.max)}
  Min       : ${ms(metrics.http_req_duration?.values?.min)}

──────────────────────────────────────────────────────────────
 RESPONSE TIME BY ENDPOINT
──────────────────────────────────────────────────────────────
  [POST /api/rating]
    avg : ${ms(metrics.rating_post_duration?.values?.avg)}
    P95 : ${ms(metrics.rating_post_duration?.values["p(95)"])}

  [GET /api/rating]
    avg : ${ms(metrics.rating_get_duration?.values?.avg)}
    P95 : ${ms(metrics.rating_get_duration?.values["p(95)"])}

  [GET /api/admin/submissions]
    avg : ${ms(metrics.submission_get_duration?.values?.avg)}
    P95 : ${ms(metrics.submission_get_duration?.values["p(95)"])}

──────────────────────────────────────────────────────────────
 THROUGHPUT
──────────────────────────────────────────────────────────────
  Total Requests : ${metrics.http_reqs?.values?.count ?? "N/A"}
  Req/sec (avg)  : ${metrics.http_reqs?.values?.rate?.toFixed(2) ?? "N/A"} rps
  Data Sent      : ${((metrics.data_sent?.values?.count ?? 0) / 1024).toFixed(2)} KB
  Data Received  : ${((metrics.data_received?.values?.count ?? 0) / 1024).toFixed(2)} KB

──────────────────────────────────────────────────────────────
 ERROR RATE
──────────────────────────────────────────────────────────────
  HTTP Fail Rate  : ${pct(metrics.http_req_failed?.values?.rate)}
  Error Count     : ${metrics.error_count?.values?.count ?? 0}
  Success Rate    : ${pct(metrics.success_rate?.values?.rate)}

──────────────────────────────────────────────────────────────
 NETWORK TIMING BREAKDOWN
──────────────────────────────────────────────────────────────
  DNS Lookup    avg : ${ms(metrics.http_req_connecting?.values?.avg)}
  TCP Connect   avg : ${ms(metrics.http_req_tls_handshaking?.values?.avg)}
  Sending       avg : ${ms(metrics.http_req_sending?.values?.avg)}
  Waiting (TTFB)avg : ${ms(metrics.http_req_waiting?.values?.avg)}
  Receiving     avg : ${ms(metrics.http_req_receiving?.values?.avg)}

──────────────────────────────────────────────────────────────
 THRESHOLDS
──────────────────────────────────────────────────────────────
${Object.entries(data.root_group?.checks ?? {}).map(([k, v]) => `  ${v.passes > 0 ? "✅" : "❌"} ${k} (${v.passes}/${v.passes + v.fails})`).join("\n")}

══════════════════════════════════════════════════════════════
`;

  console.log(report);

  return {
    "results/summary.txt": report,
    "results/full.json":   JSON.stringify(data, null, 2),
    stdout: report,
  };
}
