// flex message types are not re-exported by the SDK's root package, and
// deep imports proved unreliable under Next's build environment. Using any
// keeps our helper strongly typed enough without blocking compilation.
type FlexMessage = any;
type FlexBubble = any;
type FlexCarousel = any;
import { RouteResult } from "./maps";
import { calcCo2Saved, calcPoints, MODE_LABEL, MODE_EMOJI } from "./carbon";

function buildRouteBubble(route: RouteResult, userTotalPoints: number, index: number): FlexBubble {
  const co2Saved = calcCo2Saved(route.distanceKm, route.mode);
  const points = calcPoints(co2Saved);
  const emoji = MODE_EMOJI[route.mode] ?? "🚗";
  const label = MODE_LABEL[route.mode] ?? route.mode;
  const co2SavedKg = (co2Saved / 1000).toFixed(2);
  const bgColor = co2Saved > 500 ? "#1b5e20" : co2Saved > 100 ? "#2e7d32" : "#558b2f";

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
          size: "lg",
          color: "#ffffff",
        },
      ],
      backgroundColor: bgColor,
      paddingAll: "12px",
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "📄 ระยะทาง", size: "sm", color: "#666666", flex: 2 },
            {
              type: "text",
              text: `${route.distanceKm.toFixed(1)} km`,
              size: "sm",
              weight: "bold",
              align: "end",
              flex: 1,
            },
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "⏱️ เวลา", size: "sm", color: "#666666", flex: 2 },
            {
              type: "text",
              text: `~${route.durationMin} นาที`,
              size: "sm",
              weight: "bold",
              align: "end",
              flex: 1,
            },
          ],
        },
        { type: "separator", margin: "md", color: "#dddddd" },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "🌿 CO₂ ประหยัด", size: "sm", color: bgColor, weight: "bold", flex: 2 },
            {
              type: "text",
              text: `${co2SavedKg} kg`,
              size: "sm",
              weight: "bold",
              color: bgColor,
              align: "end",
              flex: 1,
            },
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "⭐ แต้มได้", size: "sm", color: "#f57f17", weight: "bold", flex: 2 },
            {
              type: "text",
              text: `+${points} แต้ม`,
              size: "sm",
              weight: "bold",
              color: "#f57f17",
              align: "end",
              flex: 1,
            },
          ],
        },
      ],
      paddingAll: "12px",
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        route.steps.length > 0
          ? {
              type: "text",
              text: `เส้นทาง: ${route.steps.slice(0, 2).join(" → ")}${route.steps.length > 2 ? " (...) " : ""}`,
              size: "xs",
              color: "#888888",
              wrap: true,
            }
          : { type: "text", text: "", size: "xs", color: "transparent" },
        {
          type: "box",
          layout: "horizontal",
          margin: "sm",
          contents: [
            {
              type: "text",
              text: `ฐาน: ${userTotalPoints + points} ⭐`,
              size: "xs",
              color: "#777777",
              flex: 1,
            },
          ],
        },
        {
          type: "button",
          action: {
            type: "postback",
            label: `เลือก ${label}`,
            data: `route=${index}`,
          },
          style: "primary",
          color: bgColor,
        },
      ],
      paddingAll: "10px",
    },
  };
}

export function buildRoutesFlexMessage(
  routes: RouteResult[],
  userTotalPoints: number,
  destLabel: string
): FlexMessage {
  const bubbles = routes.slice(0, 5).map((r, i) => buildRouteBubble(r, userTotalPoints, i));

  return {
    type: "flex",
    altText: `เส้นทางไป${destLabel} — ${routes.length} ตัวเลือก`,
    contents: {
      type: "carousel",
      contents: bubbles,
    } as FlexCarousel,
  };
}
