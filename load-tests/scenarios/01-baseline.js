/**
 * Scenario 1 — Baseline Test
 * ──────────────────────────
 * วัด response time ปกติด้วย user เดียว
 * ใช้เป็นค่า baseline เปรียบเทียบกับ load test
 *
 * รัน: k6 run load-tests/scenarios/01-baseline.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

const duration_rating_get  = new Trend("baseline_rating_get_ms",  true);
const duration_rating_post = new Trend("baseline_rating_post_ms", true);
const duration_admin_get   = new Trend("baseline_admin_get_ms",   true);

export const options = {
  vus: 1,
  duration: "30s",
  thresholds: {
    "baseline_rating_get_ms":  ["p(95)<300"],
    "baseline_rating_post_ms": ["p(95)<400"],
    "baseline_admin_get_ms":   ["p(95)<300"],
  },
};

export default function () {
  // GET /api/rating
  let r = http.get(`${BASE_URL}/api/rating`);
  duration_rating_get.add(r.timings.duration);
  check(r, { "GET rating 200": (res) => res.status === 200 });
  sleep(0.5);

  // POST /api/rating
  r = http.post(
    `${BASE_URL}/api/rating`,
    JSON.stringify({ rating: 4, category: "usability" }),
    { headers: { "Content-Type": "application/json" } }
  );
  duration_rating_post.add(r.timings.duration);
  check(r, { "POST rating 200": (res) => res.status === 200 });
  sleep(0.5);

  // GET /api/admin/submissions
  r = http.get(`${BASE_URL}/api/admin/submissions?status=all`);
  duration_admin_get.add(r.timings.duration);
  check(r, { "GET submissions 200": (res) => res.status === 200 });
  sleep(1);
}
