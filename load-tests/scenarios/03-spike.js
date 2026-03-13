/**
 * Scenario 3 — Spike Test
 * ────────────────────────
 * เพิ่ม load จาก 0 → 20 users ทันทีใน 2 วินาที
 * เพื่อดูว่า server รับ sudden spike ได้ไหม
 * วัด degradation จาก baseline
 *
 * รัน: k6 run load-tests/scenarios/03-spike.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

const spikeSuccess = new Rate("spike_success_rate");
const spikeRT      = new Trend("spike_response_ms", true);

export const options = {
  stages: [
    { duration: "2s",  target: 20 },  // spike ทันที
    { duration: "30s", target: 20 },  // sustain
    { duration: "5s",  target: 0  },  // drop
  ],
  thresholds: {
    // ยอมให้ช้ากว่า normal ได้เล็กน้อย
    "spike_response_ms":  ["p(95)<1000"],
    "spike_success_rate": ["rate>0.95"],   // ยอม error ได้ 5%
    "http_req_failed":    ["rate<0.05"],
  },
};

export default function () {
  const r = http.get(`${BASE_URL}/api/rating`);
  spikeRT.add(r.timings.duration);
  const ok = check(r, {
    "spike: status 200":  (res) => res.status === 200,
    "spike: < 1000ms":    (res) => res.timings.duration < 1000,
  });
  spikeSuccess.add(ok ? 1 : 0);
  sleep(0.5);
}
