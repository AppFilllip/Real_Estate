require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { hashPassword } = require("../src/utils/password");
const { withNotDeleted } = require("../src/utils/not-deleted");

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({
    where: { shortCode: "EST" },
    update: {},
    create: {
      name: "EstateOS Demo",
      legalName: "EstateOS Demo Pvt Ltd",
      shortCode: "EST",
    },
  });

  const role = await prisma.role.upsert({
    where: {
      companyId_name: {
        companyId: company.id,
        name: "Super Admin",
      },
    },
    update: {},
    create: {
      companyId: company.id,
      code: "SUPER_ADMIN",
      name: "Super Admin",
      isSystem: true,
      permissionsJson: { "*": ["C", "R", "U", "D", "A"] },
    },
  });

  const passwordHash = await hashPassword(process.env.SEED_ADMIN_PASSWORD || "Admin@12345");

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@estateos.local").trim().toLowerCase();

  const adminUser = await prisma.user.upsert({
    where: {
      companyId_email: {
        companyId: company.id,
        email: adminEmail,
      },
    },
    update: { passwordHash, status: "ACTIVE" },
    create: {
      companyId: company.id,
      roleId: role.id,
      name: "Admin",
      email: adminEmail,
      phone: "9999999999",
      passwordHash,
      status: "ACTIVE",
    },
  });

  const verifiedUser = await prisma.user.findFirst({
    where: withNotDeleted({ email: adminEmail }),
    select: { id: true, email: true, status: true },
  });

  if (!verifiedUser) {
    throw new Error(`Seed verification failed: ${adminEmail} was not found after upsert`);
  }

  console.log("Seeded admin user:");
  console.log(`id: ${adminUser.id}`);
  console.log(`email: ${verifiedUser.email}`);
  console.log(`status: ${verifiedUser.status}`);
  console.log(`password: ${process.env.SEED_ADMIN_PASSWORD || "Admin@12345"}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
