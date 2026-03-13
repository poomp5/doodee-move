/**
 * Scenario 4 — Soak Test (ระยะยาว)
 * ──────────────────────────────────
 * 10 users นาน 5 นาที
 * ตรวจหา memory leak, connection pool exhaustion,
 * หรือ response time ที่เพิ่มขึ้นเรื่อย ๆ
 *
 * รัน: k6 run load-tests/scenarios/04-soak.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

const soakSuccess = new Rate("soak_success_rate");
const soakRT      = new Trend("soak_response_ms", true);

export const options = {
  stages: [
    { duration: "30s", target: 10 }, // ramp-up
    { duration: "5m",  target: 10 }, // soak
    { duration: "30s", target: 0  }, // ramp-down
  ],
  thresholds: {
    "soak_response_ms":  ["p(95)<700"],
    "soak_success_rate": ["rate>0.99"],
    "http_req_failed":   ["rate<0.01"],
  },
};

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

export default function () {
  // สลับ GET / POST เพื่อ simulate real usage
  if (Math.random() < 0.5) {
    const r = http.get(`${BASE_URL}/api/rating`);
    soakRT.add(r.timings.duration);
    soakSuccess.add(check(r, { "200": (res) => res.status === 200 }) ? 1 : 0);
  } else {
    const body = JSON.stringify({ rating: rand(1,5), category: "usability" });
    const r = http.post(`${BASE_URL}/api/rating`, body, {
      headers: { "Content-Type": "application/json" },
    });
    soakRT.add(r.timings.duration);
    soakSuccess.add(check(r, { "200": (res) => res.status === 200 }) ? 1 : 0);
  }
  sleep(rand(1, 3));
}
