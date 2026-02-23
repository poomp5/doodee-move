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

  // Determine background color based on eco-friendliness
  const bgColor = co2Saved > 500 ? "#1b5e20" : co2Saved > 100 ? "#2e7d32" : "#558b2f";
  const accentColor = co2Saved > 500 ? "#4caf50" : co2Saved > 100 ? "#66bb6a" : "#9ccc65";

  return {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "text",
              text: emoji,
              size: "xl",
              flex: 0,
            },
            {
              type: "box",
              layout: "vertical",
              margin: "md",
              spacing: "none",
              contents: [
                {
                  type: "text",
                  text: label,
                  weight: "bold",
                  size: "lg",
                  color: "#ffffff",
                },
              ],
            },
          ],
          verticalAlign: "center",
        },
      ],
      backgroundColor: bgColor,
      paddingAll: "16px",
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "lg",
      contents: [
        // Main stats box
        {
          type: "box",
          layout: "horizontal",
          spacing: "lg",
          contents: [
            {
              type: "box",
              layout: "vertical",
              flex: 1,
              backgroundColor: "#f5f5f5",
              paddingAll: "12px",
              cornerRadius: "8px",
              contents: [
                {
                  type: "text",
                  text: "ระยะทาง",
                  size: "xs",
                  color: "#777777",
                  margin: "none",
                },
                {
                  type: "text",
                  text: `${route.distanceKm.toFixed(1)} km`,
                  size: "lg",
                  weight: "bold",
                  color: "#333333",
                },
              ],
            },
            {
              type: "box",
              layout: "vertical",
              flex: 1,
              backgroundColor: "#f5f5f5",
              paddingAll: "12px",
              cornerRadius: "8px",
              contents: [
                {
                  type: "text",
                  text: "เวลา",
                  size: "xs",
                  color: "#777777",
                  margin: "none",
                },
                {
                  type: "text",
                  text: `~${route.durationMin} นาที`,
                  size: "lg",
                  weight: "bold",
                  color: "#333333",
                },
              ],
            },
          ],
        },

        // CO2 and Points highlights
        {
          type: "box",
          layout: "horizontal",
          spacing: "lg",
          contents: [
            {
              type: "box",
              layout: "vertical",
              flex: 1,
              backgroundColor: accentColor + "20",
              paddingAll: "12px",
              cornerRadius: "8px",
              borderColor: accentColor,
              borderWidth: "2px",
              contents: [
                {
                  type: "text",
                  text: "🌿 CO₂ ประหยัด",
                  size: "xs",
                  color: bgColor,
                  weight: "bold",
                  margin: "none",
                },
                {
                  type: "text",
                  text: `${co2SavedKg} kg`,
                  size: "lg",
                  weight: "bold",
                  color: bgColor,
                },
              ],
            },
            {
              type: "box",
              layout: "vertical",
              flex: 1,
              backgroundColor: "#fff3e0",
              paddingAll: "12px",
              cornerRadius: "8px",
              borderColor: "#f57f17",
              borderWidth: "2px",
              contents: [
                {
                  type: "text",
                  text: "⭐ แต้มได้",
                  size: "xs",
                  color: "#f57f17",
                  weight: "bold",
                  margin: "none",
                },
                {
                  type: "text",
                  text: `+${points}`,
                  size: "lg",
                  weight: "bold",
                  color: "#f57f17",
                },
              ],
            },
          ],
        },

        // Route steps
        route.steps.length > 0
          ? {
              type: "box",
              layout: "vertical",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "เส้นทาง",
                  size: "xs",
                  weight: "bold",
                  color: "#777777",
                },
                ...route.steps.slice(0, 3).map((step) => ({
                  type: "text" as const,
                  text: `→ ${step}`,
                  size: "xs",
                  wrap: true,
                  color: "#666666",
                })),
              ],
            }
          : { type: "box", layout: "vertical", contents: [] },
      ],
      paddingAll: "16px",
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          paddingAll: "8px",
          backgroundColor: "#f9f9f9",
          cornerRadius: "6px",
          contents: [
            {
              type: "text",
              text: "รวมแต้มคุณ:",
              size: "xs",
              color: "#777777",
              flex: 0,
            },
            {
              type: "text",
              text: `${userTotalPoints + points} ⭐`,
              size: "sm",
              weight: "bold",
              color: "#f57f17",
              align: "end",
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
          margin: "sm",
        },
      ],
      paddingAll: "12px",
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
