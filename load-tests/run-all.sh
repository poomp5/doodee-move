#!/usr/bin/env bash
# ============================================================
# run-all.sh — รัน Load Test ทุก Scenario ตามลำดับ
# ============================================================
# วิธีใช้:
#   chmod +x load-tests/run-all.sh
#   ./load-tests/run-all.sh
#   BASE_URL=https://your-domain.com ./load-tests/run-all.sh
# ============================================================

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
RESULTS_DIR="load-tests/results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "=============================================="
echo "  doodee-move Load Test Suite"
echo "  Base URL : $BASE_URL"
echo "  Time     : $(date)"
echo "=============================================="

# สร้าง results directory
mkdir -p "$RESULTS_DIR"

# ─── ตรวจสอบ k6 ───────────────────────────────────────────
if ! command -v k6 &> /dev/null; then
  echo "❌ k6 ไม่ได้ติดตั้ง — ติดตั้งด้วย:"
  echo "   macOS : brew install k6"
  echo "   Linux : sudo apt-get install k6"
  exit 1
fi

echo "✅ k6 version: $(k6 version)"
echo ""

# ─── ตรวจสอบ server ────────────────────────────────────────
echo "🔍 ตรวจสอบ server ที่ $BASE_URL ..."
if curl -sf "$BASE_URL/api/webhook" > /dev/null 2>&1; then
  echo "✅ Server พร้อม"
else
  echo "⚠️  Server อาจยังไม่พร้อม — ดำเนินการต่อ..."
fi
echo ""

run_scenario() {
  local name="$1"
  local file="$2"
  local output_base="$RESULTS_DIR/${TIMESTAMP}_${name}"

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "▶  $name"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  k6 run \
    --out json="${output_base}.json" \
    --out csv="${output_base}.csv" \
    -e BASE_URL="$BASE_URL" \
    "$file" 2>&1 | tee "${output_base}_stdout.txt"

  echo ""
  echo "📁 Results saved: ${output_base}.*"
  echo ""
}

# ─── รัน Scenarios ─────────────────────────────────────────
run_scenario "01-baseline"    "load-tests/scenarios/01-baseline.js"
run_scenario "02-normal-load" "load-tests/scenarios/02-normal-load.js"
run_scenario "03-spike"       "load-tests/scenarios/03-spike.js"
run_scenario "04-soak"        "load-tests/scenarios/04-soak.js"

echo "=============================================="
echo "✅ ทดสอบทุก Scenario เสร็จสิ้น"
echo "   ดู results ได้ที่: $RESULTS_DIR/"
echo "=============================================="
