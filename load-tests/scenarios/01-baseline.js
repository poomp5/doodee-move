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
import crypto from "k6/crypto";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const CHANNEL_SECRET = __ENV.LINE_CHANNEL_SECRET || "default_test_secret";

const duration_webhook_text     = new Trend("baseline_webhook_text_ms",     true);
const duration_webhook_location = new Trend("baseline_webhook_location_ms", true);
const duration_webhook_follow   = new Trend("baseline_webhook_follow_ms",   true);

export const options = {
  vus: 1,
  duration: "30s",
  thresholds: {
    "baseline_webhook_text_ms":     ["p(95)<500"],
    "baseline_webhook_location_ms": ["p(95)<800"],
    "baseline_webhook_follow_ms":   ["p(95)<400"],
  },
};

function createLineSignature(body) {
  return crypto.hmac("sha256", CHANNEL_SECRET, body, "base64");
}

function randomUserId() {
  return `Ubaseline${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

export default function () {
  // POST /api/webhook - Text Message
  const userId = randomUserId();
  const textEvent = {
    type: "message",
    replyToken: `test-token-${Date.now()}`,
    source: { userId: userId, type: "user" },
    timestamp: Date.now(),
    mode: "active",
    message: {
      type: "text",
      id: `msg-${Date.now()}`,
      text: "hello"
    }
  };
  
  let webhookPayload = JSON.stringify({ events: [textEvent] });
  let signature = createLineSignature(webhookPayload);
  
  let r = http.post(
    `${BASE_URL}/api/webhook`,
    webhookPayload,
    { headers: { "Content-Type": "application/json", "x-line-signature": signature } }
  );
  duration_webhook_text.add(r.timings.duration);
  check(r, { "POST webhook text 200 or 401": (res) => res.status === 200 || res.status === 401 });
  sleep(0.5);

  // POST /api/webhook - Location Message
  const locationEvent = {
    type: "message",
    replyToken: `test-token-${Date.now()}`,
    source: { userId: userId, type: "user" },
    timestamp: Date.now(),
    mode: "active",
    message: {
      type: "location",
      id: `msg-${Date.now()}`,
      latitude: 13.7563,
      longitude: 100.5018,
      address: "Bangkok",
      title: "My Location"
    }
  };
  
  webhookPayload = JSON.stringify({ events: [locationEvent] });
  signature = createLineSignature(webhookPayload);
  
  r = http.post(
    `${BASE_URL}/api/webhook`,
    webhookPayload,
    { headers: { "Content-Type": "application/json", "x-line-signature": signature } }
  );
  duration_webhook_location.add(r.timings.duration);
  check(r, { "POST webhook location 200 or 401": (res) => res.status === 200 || res.status === 401 });
  sleep(0.5);

  // POST /api/webhook - Follow Event
  const followEvent = {
    type: "follow",
    replyToken: `test-token-${Date.now()}`,
    source: { userId: randomUserId(), type: "user" },
    timestamp: Date.now(),
    mode: "active"
  };
  
  webhookPayload = JSON.stringify({ events: [followEvent] });
  signature = createLineSignature(webhookPayload);
  
  r = http.post(
    `${BASE_URL}/api/webhook`,
    webhookPayload,
    { headers: { "Content-Type": "application/json", "x-line-signature": signature } }
  );
  duration_webhook_follow.add(r.timings.duration);
  check(r, { "POST webhook follow 200 or 401": (res) => res.status === 200 || res.status === 401 });
  sleep(1);
}
