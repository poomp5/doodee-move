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
import crypto from "k6/crypto";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const CHANNEL_SECRET = __ENV.LINE_CHANNEL_SECRET || "default_test_secret";

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
    "spike_response_ms":  ["p(95)<1500"],
    "spike_success_rate": ["rate>0.95"],   // ยอม error ได้ 5%
    "http_req_failed":    ["rate<0.05"],
  },
};

function createLineSignature(body) {
  return crypto.hmac("sha256", CHANNEL_SECRET, body, "base64");
}

function randomUserId() {
  return `Uspike${Date.now() % 10000}${Math.floor(Math.random() * 1000)}`;
}

export default function () {
  const userId = randomUserId();
  const event = {
    type: "message",
    replyToken: `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    source: { userId: userId, type: "user" },
    timestamp: Date.now(),
    mode: "active",
    message: {
      type: "text",
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: "test spike"
    }
  };
  
  const payload = JSON.stringify({ events: [event] });
  const signature = createLineSignature(payload);
  
  const r = http.post(`${BASE_URL}/api/webhook`, payload, {
    headers: { 
      "Content-Type": "application/json",
      "x-line-signature": signature
    }
  });
  
  spikeRT.add(r.timings.duration);
  const ok = check(r, {
    "spike: status 200 or 401":  (res) => res.status === 200 || res.status === 401,
    "spike: < 1500ms":           (res) => res.timings.duration < 1500,
  });
  spikeSuccess.add(ok ? 1 : 0);
  sleep(0.5);
}
