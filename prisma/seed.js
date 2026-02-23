require("dotenv").config({ path: ".env.local" });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.trip.deleteMany();
  await prisma.user.deleteMany();

  const users = await Promise.all([
    prisma.user.create({
      data: {
        lineUserId: "line_001",
        displayName: "Alice Green",
        totalPoints: 1250,
        totalCo2Saved: 45600,
      },
    }),
    prisma.user.create({
      data: {
        lineUserId: "line_002",
        displayName: "Bob Eco",
        totalPoints: 980,
        totalCo2Saved: 38200,
      },
    }),
    prisma.user.create({
      data: {
        lineUserId: "line_003",
        displayName: "Carol Bike",
        totalPoints: 1520,
        totalCo2Saved: 52100,
      },
    }),
  ]);

  const modes = ["BTS", "MRT", "BUS", "BICYCLE"];

  for (const user of users) {
    for (let i = 0; i < 3; i++) {
      const mode = modes[Math.floor(Math.random() * modes.length)];
      const distanceKm = Math.random() * 20 + 1;
      const co2Saved = distanceKm * 120;
      const points = Math.floor(distanceKm * 10);

      await prisma.trip.create({
        data: {
          userId: user.id,
          originLat: 13.7563,
          originLng: 100.5018,
          destLat: 13.7262,
          destLng: 100.5584,
          destLabel: "Bangkok",
          mode,
          distanceKm,
          co2Saved,
          points,
        },
      });
    }
  }

  console.log("✅ Seeded!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());