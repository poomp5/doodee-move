// flex message types are not re-exported by the SDK's root package, and
// deep imports proved unreliable under Next's build environment. Using any
// keeps our helper strongly typed enough without blocking compilation.
type FlexMessage = any;
type FlexBubble = any;
type FlexCarousel = any;
import { RouteResult } from "./maps";
import { calcCo2Saved, calcPoints, MODE_LABEL, MODE_EMOJI } from "./carbon";

function buildRouteBubble(route: RouteResult, userTotalPoints: number): FlexBubble {
  const co2Saved = calcCo2Saved(route.distanceKm, route.mode);
  const points = calcPoints(co2Saved);
  const emoji = MODE_EMOJI[route.mode] ?? "🚗";
  const label = MODE_LABEL[route.mode] ?? route.mode;
  const co2SavedKg = (co2Saved / 1000).toFixed(2);

  return {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `${emoji} ${label}`,
          weight: "bold",
          size: "md",
          color: "#ffffff",
        },
      ],
      backgroundColor: co2Saved > 500 ? "#2e7d32" : co2Saved > 100 ? "#388e3c" : "#558b2f",
      paddingAll: "12px",
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "ระยะทาง", size: "sm", color: "#888888", flex: 2 },
            {
              type: "text",
              text: `${route.distanceKm.toFixed(1)} km`,
              size: "sm",
              weight: "bold",
              flex: 3,
            },
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "เวลา", size: "sm", color: "#888888", flex: 2 },
            {
              type: "text",
              text: `~${route.durationMin} นาที`,
              size: "sm",
              weight: "bold",
              flex: 3,
            },
          ],
        },
        { type: "separator", margin: "sm" },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "🌿 CO₂ ประหยัด", size: "sm", color: "#2e7d32", flex: 3 },
            {
              type: "text",
              text: `${co2SavedKg} kg`,
              size: "sm",
              weight: "bold",
              color: "#2e7d32",
              flex: 2,
            },
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "⭐ แต้มรักษ์โลก", size: "sm", color: "#f57f17", flex: 3 },
            {
              type: "text",
              text: `+${points} แต้ม`,
              size: "sm",
              weight: "bold",
              color: "#f57f17",
              flex: 2,
            },
          ],
        },
        { type: "separator", margin: "sm" },
        {
          type: "text",
          text: "เส้นทาง",
          size: "xs",
          color: "#888888",
          margin: "sm",
        },
        ...route.steps.map((step) => ({
          type: "text" as const,
          text: `• ${step}`,
          size: "xs",
          wrap: true,
          color: "#444444",
        })),
      ],
      paddingAll: "12px",
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `รวมแต้มของคุณ: ${userTotalPoints + points} ⭐`,
          size: "xs",
          color: "#888888",
          align: "center",
        },
      ],
      paddingAll: "8px",
    },
  };
}

export function buildRoutesFlexMessage(
  routes: RouteResult[],
  userTotalPoints: number,
  destLabel: string
): FlexMessage {
  const bubbles = routes.slice(0, 5).map((r) => buildRouteBubble(r, userTotalPoints));

  return {
    type: "flex",
    altText: `เส้นทางไป${destLabel} — ${routes.length} ตัวเลือก`,
    contents: {
      type: "carousel",
      contents: bubbles,
    } as FlexCarousel,
  };
}
