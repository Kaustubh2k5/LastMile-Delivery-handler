import { prisma } from "@/lib/db";

export async function resolveZoneByPin(pinCode: string) {
  const pin = pinCode.trim();
  const area = await prisma.area.findUnique({
    where: { pinCode: pin },
    include: { zone: true },
  });
  if (!area) {
    throw Object.assign(
      new Error(`ZONE_NOT_FOUND: No area mapped for PIN ${pin}`),
      { status: 400 }
    );
  }
  return area.zone;
}
