/**
 * Scenario 2 — Normal Load Test (20 Concurrent Users)
 * ─────────────────────────────────────────────────────
 * Ramp-up 0→20 users ใน 10 วินาที
 * Sustain 20 users นาน 60 วินาที
 * Ramp-down 20→0 ใน 10 วินาที
 *
 * รัน: k6 run load-tests/scenarios/02-normal-load.js
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

const successRate = new Rate("normal_success_rate");
const errorCount  = new Counter("normal_error_count");
const rtRatingGet  = new Trend("normal_rating_get_ms",  true);
const rtRatingPost = new Trend("normal_rating_post_ms", true);
const rtAdminGet   = new Trend("normal_admin_get_ms",   true);

export const options = {
  stages: [
    { duration: "10s", target: 20 },  // ramp-up
    { duration: "60s", target: 20 },  // sustain 20 users
    { duration: "10s", target: 0  },  // ramp-down
  ],
  thresholds: {
    "http_req_duration":        ["p(95)<500", "p(99)<1000", "avg<300"],
    "normal_rating_get_ms":     ["p(95)<400"],
    "normal_rating_post_ms":    ["p(95)<600"],
    "normal_admin_get_ms":      ["p(95)<400"],
    "http_req_failed":          ["rate<0.01"],
    "normal_success_rate":      ["rate>0.99"],
  },
};

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

export default function () {
  group("GET /api/rating", () => {
    const r = http.get(`${BASE_URL}/api/rating`);
    rtRatingGet.add(r.timings.duration);
    const ok = check(r, {
      "status 200":        (res) => res.status === 200,
      "body has average":  (res) => res.json("averageRating") !== undefined,
      "< 500ms":           (res) => res.timings.duration < 500,
    });
    successRate.add(ok ? 1 : 0);
    if (!ok) errorCount.add(1);
    sleep(0.3);
  });

  group("POST /api/rating", () => {
    const body = JSON.stringify({
      rating:      rand(1, 5),
      lineUserId:  `Utest${rand(10000, 99999)}`,
      displayName: `LoadUser${rand(1, 1000)}`,
      category:    "usability",
    });
    const r = http.post(`${BASE_URL}/api/rating`, body, {
      headers: { "Content-Type": "application/json" },
    });
    rtRatingPost.add(r.timings.duration);
    const ok = check(r, {
      "status 200":   (res) => res.status === 200,
      "success true": (res) => { try { return res.json("success") === true; } catch { return false; } },
      "< 600ms":      (res) => res.timings.duration < 600,
    });
    successRate.add(ok ? 1 : 0);
    if (!ok) errorCount.add(1);
    sleep(0.3);
  });

  group("GET /api/admin/submissions", () => {
    const s = ["all","pending","approved"][rand(0,2)];
    const r = http.get(`${BASE_URL}/api/admin/submissions?status=${s}`);
    rtAdminGet.add(r.timings.duration);
    const ok = check(r, {
      "status 200":          (res) => res.status === 200,
      "submissions is array":(res) => { try { return Array.isArray(res.json("submissions")); } catch { return false; } },
      "< 500ms":             (res) => res.timings.duration < 500,
    });
    successRate.add(ok ? 1 : 0);
    if (!ok) errorCount.add(1);
    sleep(0.4);
  });

  sleep(1);
}
