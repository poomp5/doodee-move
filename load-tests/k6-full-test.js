/**
 * ============================================================
 * k6 Load Test — doodee-move (Next.js + PostgreSQL)
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

// ─── Base URL ───────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

// ─── Custom Metrics ─────────────────────────────────────────
const ratingPostDuration   = new Trend("rating_post_duration",   true);
const ratingGetDuration    = new Trend("rating_get_duration",    true);
const submissionGetDuration = new Trend("submission_get_duration", true);
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
    "http_req_duration":                    ["p(95)<500", "p(99)<1000", "avg<300"],
    "rating_post_duration":                 ["p(95)<600", "avg<400"],
    "rating_get_duration":                  ["p(95)<400", "avg<200"],
    "submission_get_duration":              ["p(95)<400", "avg<200"],

    // Error rate
    "http_req_failed":                      ["rate<0.01"],   // < 1%
    "error_rate":                           ["rate<0.01"],
    "success_rate":                         ["rate>0.99"],   // > 99%

    // Throughput — ต้องการอย่างน้อย 5 req/s
    "http_reqs":                            ["rate>5"],
  },
};

// ─── Helper: สุ่ม rating 1-5 ─────────────────────────────────
function randomRating() {
  return Math.floor(Math.random() * 5) + 1;
}

// ─── Helper: สุ่ม LINE User ID ───────────────────────────────
function randomUserId() {
  const id = Math.floor(Math.random() * 10000).toString().padStart(5, "0");
  return `Utest${id}`;
}

// ─── Main Test Function ──────────────────────────────────────
export default function () {
  activeVUsers.add(1);

  // ── Group 1: GET Rating Statistics ──────────────────────
  group("GET /api/rating (สถิติคะแนน)", function () {
    const res = http.get(`${BASE_URL}/api/rating`, {
      tags: { endpoint: "rating_get" },
    });

    ratingGetDuration.add(res.timings.duration);

    const passed = check(res, {
      "status 200":            (r) => r.status === 200,
      "has totalRatings":      (r) => JSON.parse(r.body).totalRatings !== undefined,
      "has averageRating":     (r) => JSON.parse(r.body).averageRating !== undefined,
      "has distribution":      (r) => JSON.parse(r.body).distribution !== undefined,
      "response time < 500ms": (r) => r.timings.duration < 500,
    });

    successRate.add(passed ? 1 : 0);
    errorRate.add(passed ? 0 : 1);
    if (!passed) errorCount.add(1);

    sleep(0.5);
  });

  // ── Group 2: POST Rating ─────────────────────────────────
  group("POST /api/rating (ส่งคะแนน)", function () {
    const payload = JSON.stringify({
      rating:      randomRating(),
      lineUserId:  randomUserId(),
      displayName: `TestUser_${randomUserId()}`,
      category:    "usability",
    });

    const params = {
      headers: { "Content-Type": "application/json" },
      tags:    { endpoint: "rating_post" },
    };

    const res = http.post(`${BASE_URL}/api/rating`, payload, params);

    ratingPostDuration.add(res.timings.duration);

    const passed = check(res, {
      "status 200":            (r) => r.status === 200,
      "success true":          (r) => {
        try { return JSON.parse(r.body).success === true; } catch { return false; }
      },
      "has rating id":         (r) => {
        try { return JSON.parse(r.body).rating?.id !== undefined; } catch { return false; }
      },
      "response time < 600ms": (r) => r.timings.duration < 600,
    });

    successRate.add(passed ? 1 : 0);
    errorRate.add(passed ? 0 : 1);
    if (!passed) errorCount.add(1);

    sleep(0.5);
  });

  // ── Group 3: GET Admin Submissions ───────────────────────
  group("GET /api/admin/submissions (รายการ submissions)", function () {
    const statuses = ["all", "pending", "approved", "rejected"];
    const status   = statuses[Math.floor(Math.random() * statuses.length)];

    const res = http.get(`${BASE_URL}/api/admin/submissions?status=${status}`, {
      tags: { endpoint: "submissions_get" },
    });

    submissionGetDuration.add(res.timings.duration);

    const passed = check(res, {
      "status 200":            (r) => r.status === 200,
      "has submissions array": (r) => {
        try { return Array.isArray(JSON.parse(r.body).submissions); } catch { return false; }
      },
      "response time < 500ms": (r) => r.timings.duration < 500,
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
