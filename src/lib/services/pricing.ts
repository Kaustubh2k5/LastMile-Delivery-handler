import { OrderType, PaymentType, RateScope } from "@/lib/enums";
import { prisma } from "@/lib/db";
import { resolveZoneByPin } from "@/lib/services/zones";

export type PricingInput = {
  pickupPin: string;
  dropPin: string;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
  actualWeightKg: number;
  orderType: OrderType;
  paymentType: PaymentType;
};

export type QuoteResult = {
  pickupZone: { id: string; name: string; code: string };
  dropZone: { id: string; name: string; code: string };
  scope: RateScope;
  volumetricDivisor: number;
  volumetricWeightKg: number;
  actualWeightKg: number;
  billableWeightKg: number;
  rateCardId: string;
  rateLabel: string | null;
  ratePerKg: number;
  flatRate: number | null;
  baseCharge: number;
  codSurcharge: number;
  totalCharge: number;
  chargeBreakdown: Record<string, unknown>;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Rate calculation engine (LLD §3).
 * All commercial values come from DB rate cards / COD surcharges.
 */
export async function calculateQuote(input: PricingInput): Promise<QuoteResult> {
  const divisor = Number(process.env.VOLUMETRIC_DIVISOR || 5000);
  const pickupZone = await resolveZoneByPin(input.pickupPin);
  const dropZone = await resolveZoneByPin(input.dropPin);

  const volumetricWeightKg = round2(
    (input.lengthCm * input.breadthCm * input.heightCm) / divisor
  );
  const billableWeightKg = round2(
    Math.max(input.actualWeightKg, volumetricWeightKg)
  );

  const scope: RateScope =
    pickupZone.id === dropZone.id ? RateScope.INTRA : RateScope.INTER;

  const cards = await prisma.rateCard.findMany({
    where: {
      orderType: input.orderType,
      scope,
      active: true,
      minWeightKg: { lte: billableWeightKg },
    },
    orderBy: { minWeightKg: "desc" },
  });

  const rateCard = cards.find(
    (c) => c.maxWeightKg == null || billableWeightKg <= c.maxWeightKg
  );

  if (!rateCard) {
    throw Object.assign(
      new Error(
        `No rate card for ${input.orderType} ${scope} at ${billableWeightKg} kg`
      ),
      { status: 400 }
    );
  }

  const baseCharge = round2(
    rateCard.flatRate != null
      ? rateCard.flatRate
      : rateCard.ratePerKg * billableWeightKg
  );

  let codSurcharge = 0;
  if (input.paymentType === PaymentType.COD) {
    const surcharge = await prisma.codSurcharge.findUnique({
      where: { orderType: input.orderType },
    });
    if (!surcharge) {
      throw Object.assign(
        new Error(`COD surcharge not configured for ${input.orderType}`),
        { status: 400 }
      );
    }
    codSurcharge = surcharge.surchargeAmount;
  }

  const totalCharge = round2(baseCharge + codSurcharge);

  const chargeBreakdown = {
    pickupZone: { id: pickupZone.id, name: pickupZone.name, code: pickupZone.code },
    dropZone: { id: dropZone.id, name: dropZone.name, code: dropZone.code },
    scope,
    volumetricDivisor: divisor,
    dimensionsCm: {
      L: input.lengthCm,
      B: input.breadthCm,
      H: input.heightCm,
    },
    actualWeightKg: input.actualWeightKg,
    volumetricWeightKg,
    billableWeightKg,
    orderType: input.orderType,
    paymentType: input.paymentType,
    rateCard: {
      id: rateCard.id,
      label: rateCard.label,
      minWeightKg: rateCard.minWeightKg,
      maxWeightKg: rateCard.maxWeightKg,
      ratePerKg: rateCard.ratePerKg,
      flatRate: rateCard.flatRate,
    },
    baseCharge,
    codSurcharge,
    totalCharge,
  };

  return {
    pickupZone: { id: pickupZone.id, name: pickupZone.name, code: pickupZone.code },
    dropZone: { id: dropZone.id, name: dropZone.name, code: dropZone.code },
    scope,
    volumetricDivisor: divisor,
    volumetricWeightKg,
    actualWeightKg: input.actualWeightKg,
    billableWeightKg,
    rateCardId: rateCard.id,
    rateLabel: rateCard.label,
    ratePerKg: rateCard.ratePerKg,
    flatRate: rateCard.flatRate,
    baseCharge,
    codSurcharge,
    totalCharge,
    chargeBreakdown,
  };
}
