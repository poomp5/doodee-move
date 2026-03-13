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
import crypto from "k6/crypto";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const CHANNEL_SECRET = __ENV.LINE_CHANNEL_SECRET || "default_test_secret";

const soakSuccess = new Rate("soak_success_rate");
const soakRT      = new Trend("soak_response_ms", true);

export const options = {
  stages: [
    { duration: "30s", target: 10 }, // ramp-up
    { duration: "5m",  target: 10 }, // soak
    { duration: "30s", target: 0  }, // ramp-down
  ],
  thresholds: {
    "soak_response_ms":  ["p(95)<1000"],
    "soak_success_rate": ["rate>0.99"],
    "http_req_failed":   ["rate<0.01"],
  },
};

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function createLineSignature(body) {
  return crypto.hmac("sha256", CHANNEL_SECRET, body, "base64");
}

function randomUserId() {
  return `Usoak${Date.now() % 10000}${rand(100, 999)}`;
}

export default function () {
  const userId = randomUserId();
  
  // สลับ text message / location message เพื่อ simulate real usage
  const useLocation = Math.random() < 0.3; // 30% location, 70% text
  
  let event;
  if (useLocation) {
    event = {
      type: "message",
      replyToken: `token-${Date.now()}-${rand(1000, 9999)}`,
      source: { userId: userId, type: "user" },
      timestamp: Date.now(),
      mode: "active",
      message: {
        type: "location",
        id: `msg-${Date.now()}-${rand(1000, 9999)}`,
        latitude: 13.7563 + (Math.random() * 0.2 - 0.1),
        longitude: 100.5018 + (Math.random() * 0.2 - 0.1),
        address: "Bangkok",
        title: "Location"
      }
    };
  } else {
    const texts = ["hello", "สวัสดี", "help", "BTS", "MRT"];
    event = {
      type: "message",
      replyToken: `token-${Date.now()}-${rand(1000, 9999)}`,
      source: { userId: userId, type: "user" },
      timestamp: Date.now(),
      mode: "active",
      message: {
        type: "text",
        id: `msg-${Date.now()}-${rand(1000, 9999)}`,
        text: texts[rand(0, texts.length - 1)]
      }
    };
  }
  
  const payload = JSON.stringify({ events: [event] });
  const signature = createLineSignature(payload);
  
  const r = http.post(`${BASE_URL}/api/webhook`, payload, {
    headers: { 
      "Content-Type": "application/json",
      "x-line-signature": signature
    }
  });
  
  soakRT.add(r.timings.duration);
  soakSuccess.add(check(r, { 
    "200 or 401": (res) => res.status === 200 || res.status === 401 
  }) ? 1 : 0);
  
  sleep(rand(1, 3));
}
