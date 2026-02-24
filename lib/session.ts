import { getPrisma } from "./prisma";

export type SessionStep = "IDLE" | "WAITING_DESTINATION" | "AWAITING_ROUTE" | "FINDING_NEAREST_BUS_STOP";

export async function getSession(lineUserId: string) {
  const prisma = getPrisma();
  return prisma.userSession.findUnique({ where: { lineUserId } });
}

export interface SessionData {
  lineUserId: string;
  step: SessionStep;
  originLat?: number;
  originLng?: number;
  destLat?: number;
  destLng?: number;
  destLabel?: string;
  pendingRoutes?: any;
}

export async function setSession(data: SessionData) {
  const prisma = getPrisma();
  const {
    lineUserId,
    step,
    originLat,
    originLng,
    destLat,
    destLng,
    destLabel,
    pendingRoutes,
  } = data;
  return prisma.userSession.upsert({
    where: { lineUserId },
    update: { step, originLat, originLng, destLat, destLng, destLabel, pendingRoutes },
    create: { lineUserId, step, originLat, originLng, destLat, destLng, destLabel, pendingRoutes },
  });
}

export async function clearSession(lineUserId: string) {
  const prisma = getPrisma();
  // we explicitly null out every field; using `undefined` in a Prisma update
  // object means “leave it alone”, which previously allowed pendingRoutes to
  // stick around and confuse later postback handling.
  return prisma.userSession.upsert({
    where: { lineUserId },
    update: {
      step: "IDLE",
      originLat: null,
      originLng: null,
      destLat: null,
      destLng: null,
      destLabel: null,
      // prisma's generated types for Json fields are annoyingly strict,
      // so cast to any when we want to clear it. this writes a SQL NULL.
      pendingRoutes: null as any,
    },
    create: { lineUserId, step: "IDLE" },
  });
}
