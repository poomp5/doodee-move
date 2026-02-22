import { Prisma, PrismaClient } from "../app/generated/prisma/client";

type GlobalForPrisma = typeof globalThis & {
  prisma?: PrismaClient;
  prismaPromise?: Promise<PrismaClient>;
};

const globalForPrisma = globalThis as GlobalForPrisma;

function isPrismaAccelerateUrl(url: string | undefined): url is string {
  return Boolean(url && (url.startsWith("prisma://") || url.startsWith("prisma+postgres://")));
}

async function importOptional<T>(moduleName: string): Promise<T> {
  return (await import(moduleName)) as T;
}

async function createPrismaClient(): Promise<PrismaClient> {
  const accelerateUrl = process.env.PRISMA_ACCELERATE_URL ?? process.env.DATABASE_URL;
  if (isPrismaAccelerateUrl(accelerateUrl)) {
    return new PrismaClient({ accelerateUrl });
  }

  try {
    const [{ PrismaPg }, { Pool }] = await Promise.all([
      importOptional<{ PrismaPg: new (pool: unknown) => NonNullable<Prisma.PrismaClientOptions["adapter"]> }>("@prisma/adapter-pg"),
      importOptional<{ Pool: new (config: { connectionString?: string }) => unknown }>("pg"),
    ]);
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    return new PrismaClient({ adapter: new PrismaPg(pool) });
  } catch {
    throw new Error(
      "Prisma 7 requires either PRISMA_ACCELERATE_URL (prisma://...) or the PostgreSQL adapter packages. Install: npm install @prisma/adapter-pg pg"
    );
  }
}

export async function getPrisma(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  if (!globalForPrisma.prismaPromise) {
    globalForPrisma.prismaPromise = createPrismaClient();
  }

  const prisma = await globalForPrisma.prismaPromise;

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }

  return prisma;
}
