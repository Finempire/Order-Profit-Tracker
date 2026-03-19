import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const seedUsers = [
    {
      name: "Admin User",
      email: "admin@company.com",
      password: "Admin@1234",
      role: Role.ADMIN,
    },
    {
      name: "CEO",
      email: "ceo@company.com",
      password: "CEO@1234",
      role: Role.CEO,
    },
    {
      name: "Accounts Manager",
      email: "accounts@company.com",
      password: "Acc@1234",
      role: Role.ACCOUNTANT,
    },
    {
      name: "Production User",
      email: "production@company.com",
      password: "Prod@1234",
      role: Role.PRODUCTION,
    },
  ];

  for (const user of seedUsers) {
    const hashed = await bcrypt.hash(user.password, 12);
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        name: user.name,
        email: user.email,
        password: hashed,
        role: user.role,
        isActive: true,
        mustChangePassword: true,
      },
    });
    console.log(`✅ Seeded: ${user.email}`);
  }

  // Seed a sample buyer
  await prisma.buyer.upsert({
    where: { id: "sample-buyer-001" },
    update: {},
    create: {
      id: "sample-buyer-001",
      name: "Sample Trading Co.",
      email: "buyer@sample.com",
      phone: "9876543210",
      address: "123 Market Street, Mumbai, MH 400001",
      shippingAddress: "456 Warehouse Road, Mumbai, MH 400002",
      gstin: "27AADCS0472N1Z1",
    },
  });
  console.log("✅ Seeded: Sample Buyer");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
