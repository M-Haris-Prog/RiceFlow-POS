import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser(
  role: "OWNER" | "CASHIER",
  usernameEnv: string,
  passwordEnv: string,
  displayNameEnv: string,
  fallbackDisplayName: string,
  optional = false
) {
  const username = process.env[usernameEnv];
  const password = process.env[passwordEnv];
  const displayName = process.env[displayNameEnv] ?? fallbackDisplayName;

  if (!username || !password) {
    if (optional) {
      console.log(`Skipping ${role.toLowerCase()} (${usernameEnv}/${passwordEnv} not set)`);
      return;
    }
    throw new Error(
      `Missing ${usernameEnv} or ${passwordEnv} in environment — check your .env file.`
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { username },
    update: { passwordHash, displayName, role },
    create: { username, passwordHash, displayName, role },
  });

  console.log(`Seeded ${role.toLowerCase()}: ${username}`);
}

async function main() {
  await upsertUser("OWNER", "OWNER1_USERNAME", "OWNER1_PASSWORD", "OWNER1_DISPLAY_NAME", "Owner 1");
  await upsertUser("OWNER", "OWNER2_USERNAME", "OWNER2_PASSWORD", "OWNER2_DISPLAY_NAME", "Owner 2");
  await upsertUser(
    "CASHIER",
    "CASHIER_USERNAME",
    "CASHIER_PASSWORD",
    "CASHIER_DISPLAY_NAME",
    "Cashier",
    true
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
