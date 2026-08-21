import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Role, AgentStatus, OrderType, RateScope } from "../src/lib/enums";

const prisma = new PrismaClient();

async function main() {
  await prisma.notificationLog.deleteMany();
  await prisma.outboxEvent.deleteMany();
  await prisma.trackingEvent.deleteMany();
  await prisma.deliveryAttempt.deleteMany();
  await prisma.order.deleteMany();
  await prisma.codSurcharge.deleteMany();
  await prisma.rateCard.deleteMany();
  await prisma.area.deleteMany();
  await prisma.user.deleteMany();
  await prisma.zone.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  const north = await prisma.zone.create({
    data: { name: "North Delhi", code: "NDL" },
  });
  const south = await prisma.zone.create({
    data: { name: "South Delhi", code: "SDL" },
  });
  const ncr = await prisma.zone.create({
    data: { name: "NCR Gurgaon", code: "GGN" },
  });

  await prisma.area.createMany({
    data: [
      { zoneId: north.id, name: "Model Town", pinCode: "110009", city: "Delhi" },
      { zoneId: north.id, name: "Civil Lines", pinCode: "110054", city: "Delhi" },
      { zoneId: south.id, name: "Saket", pinCode: "110017", city: "Delhi" },
      { zoneId: south.id, name: "Hauz Khas", pinCode: "110016", city: "Delhi" },
      { zoneId: ncr.id, name: "Cyber City", pinCode: "122002", city: "Gurgaon" },
      { zoneId: ncr.id, name: "DLF Phase 3", pinCode: "122010", city: "Gurgaon" },
    ],
  });

  const rateRows = [
    { orderType: OrderType.B2C, scope: RateScope.INTRA, minWeightKg: 0, maxWeightKg: 5, ratePerKg: 25, flatRate: null as number | null, label: "B2C Intra 0-5kg" },
    { orderType: OrderType.B2C, scope: RateScope.INTRA, minWeightKg: 5, maxWeightKg: 20, ratePerKg: 22, flatRate: null, label: "B2C Intra 5-20kg" },
    { orderType: OrderType.B2C, scope: RateScope.INTRA, minWeightKg: 20, maxWeightKg: null, ratePerKg: 18, flatRate: null, label: "B2C Intra 20kg+" },
    { orderType: OrderType.B2C, scope: RateScope.INTER, minWeightKg: 0, maxWeightKg: 5, ratePerKg: 40, flatRate: null, label: "B2C Inter 0-5kg" },
    { orderType: OrderType.B2C, scope: RateScope.INTER, minWeightKg: 5, maxWeightKg: 20, ratePerKg: 35, flatRate: null, label: "B2C Inter 5-20kg" },
    { orderType: OrderType.B2C, scope: RateScope.INTER, minWeightKg: 20, maxWeightKg: null, ratePerKg: 30, flatRate: null, label: "B2C Inter 20kg+" },
    { orderType: OrderType.B2B, scope: RateScope.INTRA, minWeightKg: 0, maxWeightKg: 5, ratePerKg: 18, flatRate: 80, label: "B2B Intra 0-5kg flat" },
    { orderType: OrderType.B2B, scope: RateScope.INTRA, minWeightKg: 5, maxWeightKg: 20, ratePerKg: 15, flatRate: null, label: "B2B Intra 5-20kg" },
    { orderType: OrderType.B2B, scope: RateScope.INTRA, minWeightKg: 20, maxWeightKg: null, ratePerKg: 12, flatRate: null, label: "B2B Intra 20kg+" },
    { orderType: OrderType.B2B, scope: RateScope.INTER, minWeightKg: 0, maxWeightKg: 5, ratePerKg: 28, flatRate: null, label: "B2B Inter 0-5kg" },
    { orderType: OrderType.B2B, scope: RateScope.INTER, minWeightKg: 5, maxWeightKg: 20, ratePerKg: 24, flatRate: null, label: "B2B Inter 5-20kg" },
    { orderType: OrderType.B2B, scope: RateScope.INTER, minWeightKg: 20, maxWeightKg: null, ratePerKg: 20, flatRate: null, label: "B2B Inter 20kg+" },
  ];

  for (const row of rateRows) {
    await prisma.rateCard.create({ data: row });
  }

  await prisma.codSurcharge.createMany({
    data: [
      { orderType: OrderType.B2C, surchargeAmount: 30 },
      { orderType: OrderType.B2B, surchargeAmount: 50 },
    ],
  });

  const admin = await prisma.user.create({
    data: {
      email: "admin@lastmile.local",
      passwordHash,
      name: "Ops Admin",
      phone: "9999990001",
      role: Role.ADMIN,
      emailVerified: true,
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: "customer@lastmile.local",
      passwordHash,
      name: "Riya Sharma",
      phone: "9999990002",
      role: Role.CUSTOMER,
      emailVerified: true,
    },
  });

  await prisma.user.create({
    data: {
      email: "agent1@lastmile.local",
      passwordHash,
      name: "Amit Rider",
      phone: "9999990003",
      role: Role.AGENT,
      emailVerified: true,
      agentStatus: AgentStatus.AVAILABLE,
      currentLat: 28.7193,
      currentLng: 77.1934,
      homeZoneId: north.id,
    },
  });

  await prisma.user.create({
    data: {
      email: "agent2@lastmile.local",
      passwordHash,
      name: "Neha Courier",
      phone: "9999990004",
      role: Role.AGENT,
      emailVerified: true,
      agentStatus: AgentStatus.AVAILABLE,
      currentLat: 28.5244,
      currentLng: 77.2066,
      homeZoneId: south.id,
    },
  });

  console.log("Seed complete");
  console.log({
    admin: admin.email,
    customer: customer.email,
    password: "password123",
    zones: [north.code, south.code, ncr.code],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
