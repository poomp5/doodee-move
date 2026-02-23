// flex message types are not re-exported by the SDK's root package, and
// deep imports proved unreliable under Next's build environment. Using any
// keeps our helper strongly typed enough without blocking compilation.
type FlexMessage = any;
type FlexBubble = any;
type FlexCarousel = any;
import { RouteResult } from "./maps";
import { calcCo2Saved, calcPoints, MODE_LABEL } from "./carbon";

function buildRouteBubble(route: RouteResult, userTotalPoints: number, index: number): FlexBubble {
  const co2Saved = calcCo2Saved(route.distanceKm, route.mode);
  const points = calcPoints(co2Saved);
  const label = MODE_LABEL[route.mode] ?? route.mode;
  const co2SavedKg = (co2Saved / 1000).toFixed(2);
  const primaryColor = "#2a9c64";
  const accentColor = "#f57f17";
  const lightBg = "#f0f8f5";

  return {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "image",
          url: "https://i.ibb.co/PZZybFhG/logo-2.png",
          size: "sm",
          aspectRatio: "1:1",
          flex: 0,
        },
        {
          type: "text",
          text: label,
          weight: "bold",
          size: "lg",
          color: "#ffffff",
          margin: "md",
        },
      ],
      backgroundColor: primaryColor,
      paddingAll: "12px",
      spacing: "sm",
      cornerRadius: "8px",
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          spacing: "md",
          contents: [
            {
              type: "box",
              layout: "vertical",
              flex: 0,
              width: "32px",
              height: "32px",
              backgroundColor: lightBg,
              cornerRadius: "6px",
              contents: [
                {
                  type: "image",
                  url: "https://i.ibb.co/SkMDw7s/world.png",
                  size: "sm",
                  aspectRatio: "1:1",
                  flex: 0,
                },
              ],
              justifyContent: "center",
              alignItems: "center",
            },
            {
              type: "box",
              layout: "vertical",
              flex: 1,
              contents: [
                {
                  type: "text",
                  text: "ระยะทาง",
                  size: "xs",
                  color: "#999999",
                  margin: "none",
                },
                {
                  type: "text",
                  text: `${route.distanceKm.toFixed(1)} km`,
                  size: "sm",
                  weight: "bold",
                  color: "#333333",
                },
              ],
            },
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          spacing: "md",
          contents: [
            {
              type: "box",
              layout: "vertical",
              flex: 0,
              width: "32px",
              height: "32px",
              backgroundColor: lightBg,
              cornerRadius: "6px",
              contents: [
                {
                  type: "image",
                  url: "https://i.ibb.co/sdbnqqvk/clock.png",
                  size: "sm",
                  aspectRatio: "1:1",
                  flex: 0,
                },
              ],
              justifyContent: "center",
              alignItems: "center",
            },
            {
              type: "box",
              layout: "vertical",
              flex: 1,
              contents: [
                {
                  type: "text",
                  text: "เวลา",
                  size: "xs",
                  color: "#999999",
                  margin: "none",
                },
                {
                  type: "text",
                  text: `~${route.durationMin} นาที`,
                  size: "sm",
                  weight: "bold",
                  color: "#333333",
                },
              ],
            },
          ],
        },
        { type: "separator", margin: "md", color: "#e9e9e9" },
        {
          type: "box",
          layout: "horizontal",
          spacing: "md",
          contents: [
            {
              type: "box",
              layout: "vertical",
              flex: 0,
              width: "32px",
              height: "32px",
              backgroundColor: primaryColor + "20",
              cornerRadius: "6px",
              contents: [
                {
                  type: "image",
                  url: "https://i.ibb.co/KpXgcJFf/carbon-cloud-arrow-down.png",
                  size: "sm",
                  aspectRatio: "1:1",
                  flex: 0,
                },
              ],
              justifyContent: "center",
              alignItems: "center",
            },
            {
              type: "box",
              layout: "vertical",
              flex: 1,
              contents: [
                {
                  type: "text",
                  text: "CO₂ ประหยัด",
                  size: "xs",
                  color: "#999999",
                  margin: "none",
                },
                {
                  type: "text",
                  text: `${co2SavedKg} kg`,
                  size: "sm",
                  weight: "bold",
                  color: primaryColor,
                },
              ],
            },
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          spacing: "md",
          contents: [
            {
              type: "box",
              layout: "vertical",
              flex: 0,
              width: "32px",
              height: "32px",
              backgroundColor: accentColor + "20",
              cornerRadius: "6px",
              contents: [
                {
                  type: "image",
                  url: "https://i.ibb.co/C5Y0mrWv/star.png",
                  size: "sm",
                  aspectRatio: "1:1",
                  flex: 0,
                },
              ],
              justifyContent: "center",
              alignItems: "center",
            },
            {
              type: "box",
              layout: "vertical",
              flex: 1,
              contents: [
                {
                  type: "text",
                  text: "แต้มได้",
                  size: "xs",
                  color: "#999999",
                  margin: "none",
                },
                {
                  type: "text",
                  text: `+${points} แต้ม`,
                  size: "sm",
                  weight: "bold",
                  color: accentColor,
                },
              ],
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
              text: `เส้นทาง: ${route.steps.slice(0, 2).join(" → ")}${route.steps.length > 2 ? " (...)" : ""}`,
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
              text: `รวมแต้ม: ${userTotalPoints + points}`,
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
          color: primaryColor,
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
