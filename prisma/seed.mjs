// prisma/seed.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Upsert to keep seeding idempotent
  await prisma.user.upsert({
    where: { clerkId: "undefined1" },
    update: {
      name: "anonymous",
      email: "kleptocrat@gmail.com",
    },
    create: {
      name: "anonymous",
      email: "kleptocrat@gmail.com",
      clerkId: "undefined1",
    },
  });

  console.log(
    "Seeded user: anonymous <kleptocrat@gmail.com> (clerkId: undefined1)",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
