require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { verifyPassword } = require("../src/utils/password");
const { withNotDeleted } = require("../src/utils/not-deleted");

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@estateos.local").trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "Admin@12345";
  const user = await prisma.user.findFirst({
    where: withNotDeleted({ email }),
    select: {
      email: true,
      status: true,
      passwordHash: true,
      company: { select: { name: true, shortCode: true } },
    },
  });

  console.log({
    email,
    userExists: Boolean(user),
    status: user ? user.status : null,
    company: user ? user.company : null,
    defaultPasswordWorks: user ? await verifyPassword(password, user.passwordHash) : false,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
