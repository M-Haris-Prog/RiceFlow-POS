import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertOwner(
  usernameEnv: string,
  passwordEnv: string,
  displayNameEnv: string,
  fallbackDisplayName: string
) {
  const username = process.env[usernameEnv];
  const password = process.env[passwordEnv];
  const displayName = process.env[displayNameEnv] ?? fallbackDisplayName;

  if (!username || !password) {
    throw new Error(
      `Missing ${usernameEnv} or ${passwordEnv} in environment — check your .env file.`
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { username },
    update: { passwordHash, displayName },
    create: { username, passwordHash, displayName },
  });

  console.log(`Seeded user: ${username}`);
}

async function main() {
  await upsertOwner(
    "OWNER1_USERNAME",
    "OWNER1_PASSWORD",
    "OWNER1_DISPLAY_NAME",
    "Owner 1"
  );
  await upsertOwner(
    "OWNER2_USERNAME",
    "OWNER2_PASSWORD",
    "OWNER2_DISPLAY_NAME",
    "Owner 2"
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
