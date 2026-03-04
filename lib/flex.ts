// flex message types are not re-exported by the SDK's root package, and
// deep imports proved unreliable under Next's build environment. Using any
// keeps our helper strongly typed enough without blocking compilation.
type FlexMessage = any;
type FlexBubble = any;
type FlexCarousel = any;
import { RouteResult } from "./maps";
import { calcCo2Saved, calcPoints, MODE_LABEL } from "./carbon";

function buildRouteBubble(route: RouteResult, index: number): FlexBubble {
  const co2Saved = calcCo2Saved(route.distanceKm, route.mode);
  const label = MODE_LABEL[route.mode] ?? route.mode;
  const co2SavedKg = (co2Saved / 1000).toFixed(2);
  const primaryColor = "#2a9c64";
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
                  url: "https://img5.pic.in.th/file/secure-sv1/4134f662b759323040.png",
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
                  url: "https://img2.pic.in.th/42176840fe9c34f340.png",
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
        { type: "separator", margin: "md" },
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
                  url: "https://img2.pic.in.th/43071144b09bbab817.png",
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
      ],
      paddingAll: "12px",
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
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

// builds a carousel of route bubbles used for initial choice
export function buildRoutesFlexMessage(
  routes: RouteResult[],
  destLabel: string
): FlexMessage {
  // sort by estimated duration ascending so fastest options appear first
  const sorted = routes.slice().sort((a, b) => a.durationMin - b.durationMin);
  const bubbles = sorted.slice(0, 5).map((r, i) => buildRouteBubble(r, i));

  return {
    type: "flex",
    altText: `เส้นทางไป${destLabel} — ${routes.length} ตัวเลือก`,
    contents: {
      type: "carousel",
      contents: bubbles,
    } as FlexCarousel,
  };
}

// builds a single-bubble flex message showing the full step-by-step
// instructions for a route; includes CO₂ saved, distance/time, and an
// optional static map image generated from the polyline if available.
export function buildRouteDetailFlex(
  route: RouteResult,
  destLabel: string
): FlexMessage {
  const co2SavedKg = (calcCo2Saved(route.distanceKm, route.mode) / 1000).toFixed(2);
  const primaryColor = "#2a9c64";

  // attempt to include a static map image when we have a polyline
  let heroImage: any = undefined;
  if (route.polyline) {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (key) {
      const encoded = encodeURIComponent(route.polyline);
      const url = `https://maps.googleapis.com/maps/api/staticmap?size=600x400&path=enc:${encoded}&key=${key}`;
      heroImage = {
        type: "image",
        url,
        size: "full",
        aspectRatio: "16:9",
        aspectMode: "cover",
      };
    }
  }

  const stepTexts = route.steps.map((s) => ({ type: "text", text: s, size: "sm", wrap: true }));

  const bodyContents: any[] = [
    {
      type: "text",
      text: `เส้นทางไป${destLabel} (${route.mode})`,
      weight: "bold",
      size: "md",
      wrap: true,
    },
    {
      type: "box",
      layout: "baseline",
      spacing: "xs",
      contents: [
        { type: "text", text: "ระยะทาง:", size: "xs", color: "#999999" },
        { type: "text", text: `${route.distanceKm.toFixed(1)} km`, size: "xs", weight: "bold", color: "#333333" },
        { type: "text", text: "เวลา:", size: "xs", color: "#999999", margin: "md" },
        { type: "text", text: `~${route.durationMin} นาที`, size: "xs", weight: "bold", color: "#333333" },
      ],
    },
    {
      type: "box",
      layout: "baseline",
      spacing: "xs",
      contents: [
        { type: "text", text: "CO₂ ประหยัด:", size: "xs", color: "#999999" },
        { type: "text", text: `${co2SavedKg} kg`, size: "xs", weight: "bold", color: primaryColor },
      ],
    },
    { type: "separator", margin: "md", color: "#e9e9e9" },
    ...stepTexts,
  ];

  const bubble: any = {
    type: "bubble",
    size: "kilo",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: bodyContents,
      paddingAll: "12px",
    },
  };

  if (heroImage) {
    bubble.hero = heroImage;
  }

  return {
    type: "flex",
    altText: `รายละเอียดเส้นทางไป${destLabel}`,
    contents: bubble,
  };
}

export function buildTrainStationDetailFlex(
  stationName: string,
  distanceKm: number
): FlexMessage {
  const primaryColor = "#2a9c64";
  const walkingTimeMin = Math.ceil((distanceKm / 1.4) * 60); // Assume 1.4 km/hour walking speed

  const bubble: any = {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "🚆 สถานีรถไฟใกล้ที่สุด",
          weight: "bold",
          size: "lg",
          color: "#ffffff",
        },
      ],
      backgroundColor: primaryColor,
      paddingAll: "12px",
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        {
          type: "text",
          text: stationName,
          weight: "bold",
          size: "lg",
          wrap: true,
          color: "#333333",
        },
        {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "baseline",
              spacing: "xs",
              contents: [
                { type: "text", text: "📍 ระยะทาง:", size: "xs", color: "#999999" },
                { type: "text", text: `${distanceKm.toFixed(2)} กม.`, size: "xs", weight: "bold", color: "#333333" },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "xs",
              contents: [
                { type: "text", text: "🚶 เวลาเดิน:", size: "xs", color: "#999999" },
                { type: "text", text: `${walkingTimeMin} นาที`, size: "xs", weight: "bold", color: "#333333" },
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
        {
          type: "text",
          text: "ระบบจะหาเส้นทางจากตำแหน่งปัจจุบันไปยังสถานีนี้",
          size: "xs",
          color: "#999999",
          wrap: true,
          align: "center",
        },
      ],
      paddingAll: "12px",
    },
  };

  return {
    type: "flex",
    altText: `สถานีรถไฟ: ${stationName}`,
    contents: bubble,
  };
}