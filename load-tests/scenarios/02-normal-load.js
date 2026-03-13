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
import crypto from "k6/crypto";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const CHANNEL_SECRET = __ENV.LINE_CHANNEL_SECRET || "default_test_secret";

const successRate = new Rate("normal_success_rate");
const errorCount  = new Counter("normal_error_count");
const rtWebhookText = new Trend("normal_webhook_text_ms", true);
const rtWebhookLocation = new Trend("normal_webhook_location_ms", true);
const rtWebhookMulti = new Trend("normal_webhook_multi_ms", true);

export const options = {
  stages: [
    { duration: "10s", target: 20 },  // ramp-up
    { duration: "60s", target: 20 },  // sustain 20 users
    { duration: "10s", target: 0  },  // ramp-down
  ],
  thresholds: {
    "http_req_duration":        ["p(95)<800", "p(99)<1500", "avg<500"],
    "normal_webhook_text_ms":   ["p(95)<800"],
    "normal_webhook_location_ms": ["p(95)<1000"],
    "normal_webhook_multi_ms":  ["p(95)<800"],
    "http_req_failed":          ["rate<0.01"],
    "normal_success_rate":      ["rate>0.99"],
  },
};

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function createLineSignature(body) {
  return crypto.hmac("sha256", CHANNEL_SECRET, body, "base64");
}

function randomUserId() {
  return `Uload${Date.now() % 100000}${rand(100, 999)}`;
}

export default function () {
  group("POST /api/webhook - Text Message", () => {
    const userId = randomUserId();
    const texts = ["hello", "สวัสดี", "help", "MRT", "BTS"];
    const event = {
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
    const payload = JSON.stringify({ events: [event] });
    const signature = createLineSignature(payload);
    
    const r = http.post(`${BASE_URL}/api/webhook`, payload, {
      headers: { "Content-Type": "application/json", "x-line-signature": signature },
    });
    rtWebhookText.add(r.timings.duration);
    const ok = check(r, {
      "status 200 or 401": (res) => res.status === 200 || res.status === 401,
      "has ok field":      (res) => { try { return res.json("ok") !== undefined; } catch { return false; } },
      "< 800ms":           (res) => res.timings.duration < 800,
    });
    successRate.add(ok ? 1 : 0);
    if (!ok) errorCount.add(1);
    sleep(0.3);
  });

  group("POST /api/webhook - Location Message", () => {
    const userId = randomUserId();
    const event = {
      type: "message",
      replyToken: `token-${Date.now()}-${rand(1000, 9999)}`,
      source: { userId: userId, type: "user" },
      timestamp: Date.now(),
      mode: "active",
      message: {
        type: "location",
        id: `msg-${Date.now()}-${rand(1000, 9999)}`,
        latitude: 13.7563 + (Math.random() * 0.1 - 0.05),
        longitude: 100.5018 + (Math.random() * 0.1 - 0.05),
        address: "Bangkok",
        title: "Location"
      }
    };
    const payload = JSON.stringify({ events: [event] });
    const signature = createLineSignature(payload);
    
    const r = http.post(`${BASE_URL}/api/webhook`, payload, {
      headers: { "Content-Type": "application/json", "x-line-signature": signature },
    });
    rtWebhookLocation.add(r.timings.duration);
    const ok = check(r, {
      "status 200 or 401": (res) => res.status === 200 || res.status === 401,
      "has ok field":      (res) => { try { return res.json("ok") !== undefined; } catch { return false; } },
      "< 1000ms":          (res) => res.timings.duration < 1000,
    });
    successRate.add(ok ? 1 : 0);
    if (!ok) errorCount.add(1);
    sleep(0.3);
  });

  group("POST /api/webhook - Multiple Events", () => {
    const events = [];
    for (let i = 0; i < rand(1, 3); i++) {
      events.push({
        type: "message",
        replyToken: `token-${Date.now()}-${rand(1000, 9999)}-${i}`,
        source: { userId: randomUserId(), type: "user" },
        timestamp: Date.now(),
        mode: "active",
        message: {
          type: "text",
          id: `msg-${Date.now()}-${rand(1000, 9999)}-${i}`,
          text: "test"
        }
      });
    }
    const payload = JSON.stringify({ events });
    const signature = createLineSignature(payload);
    
    const r = http.post(`${BASE_URL}/api/webhook`, payload, {
      headers: { "Content-Type": "application/json", "x-line-signature": signature },
    });
    rtWebhookMulti.add(r.timings.duration);
    const ok = check(r, {
      "status 200 or 401": (res) => res.status === 200 || res.status === 401,
      "has processed field": (res) => { try { return res.json("processed") !== undefined; } catch { return false; } },
      "< 800ms":           (res) => res.timings.duration < 800,
    });
    successRate.add(ok ? 1 : 0);
    if (!ok) errorCount.add(1);
    sleep(0.4);
  });

  sleep(1);
}
