# Quick test script for webhook load testing
# Runs a simple 10-second test with 5 users

Write-Host "🚀 Quick Webhook Load Test (10s, 5 users)" -ForegroundColor Cyan
Write-Host ""

$BASE_URL = if ($env:BASE_URL) { $env:BASE_URL } else { "http://localhost:3000" }
$CHANNEL_SECRET = if ($env:LINE_CHANNEL_SECRET) { $env:LINE_CHANNEL_SECRET } else { "default_test_secret" }

Write-Host "Base URL: $BASE_URL"
Write-Host "Using Channel Secret: $(if ($env:LINE_CHANNEL_SECRET) { 'from environment' } else { 'default' })"
Write-Host ""

# Check if k6 is installed
try {
    k6 version | Out-Null
} catch {
    Write-Host "❌ k6 not installed. Install with: choco install k6" -ForegroundColor Red
    exit 1
}

# Create temporary test file
$testScript = @"
import http from 'k6/http';
import { check, sleep } from 'k6';
import crypto from 'k6/crypto';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const CHANNEL_SECRET = __ENV.LINE_CHANNEL_SECRET || 'default_test_secret';

export const options = {
  vus: 5,
  duration: '10s',
};

function createLineSignature(body) {
  return crypto.hmac('sha256', CHANNEL_SECRET, body, 'base64');
}

export default function () {
  const userId = 'Uquick' + Date.now() + Math.floor(Math.random() * 1000);
  const event = {
    type: 'message',
    replyToken: 'test-token-' + Date.now(),
    source: { userId: userId, type: 'user' },
    timestamp: Date.now(),
    mode: 'active',
    message: {
      type: 'text',
      id: 'msg-' + Date.now(),
      text: 'quick test'
    }
  };
  
  const payload = JSON.stringify({ events: [event] });
  const signature = createLineSignature(payload);
  
  const res = http.post(BASE_URL + '/api/webhook', payload, {
    headers: { 
      'Content-Type': 'application/json',
      'x-line-signature': signature
    }
  });
  
  check(res, {
    'status OK': (r) => r.status === 200 || r.status === 401,
    'response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  sleep(0.5);
}
"@

# Save to temp file
$tempFile = "load-tests\quick-test.js"
$testScript | Out-File -FilePath $tempFile -Encoding UTF8

# Run test
Write-Host "Running test..." -ForegroundColor Yellow
$env:BASE_URL = $BASE_URL
$env:LINE_CHANNEL_SECRET = $CHANNEL_SECRET
k6 run $tempFile

# Cleanup
Remove-Item $tempFile -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "✅ Quick test completed!" -ForegroundColor Green
