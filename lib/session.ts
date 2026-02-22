import { prisma } from "./prisma";

export type SessionStep = "IDLE" | "WAITING_DESTINATION";

export async function getSession(lineUserId: string) {
  return prisma.userSession.findUnique({ where: { lineUserId } });
}

export async function setSession(
  lineUserId: string,
  step: SessionStep,
  originLat?: number,
  originLng?: number
) {
  return prisma.userSession.upsert({
    where: { lineUserId },
    update: { step, originLat, originLng },
    create: { lineUserId, step, originLat, originLng },
  });
}

export async function clearSession(lineUserId: string) {
  return prisma.userSession.upsert({
    where: { lineUserId },
    update: { step: "IDLE", originLat: null, originLng: null },
    create: { lineUserId, step: "IDLE" },
  });
}
