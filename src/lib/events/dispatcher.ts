import { prisma } from "@/lib/db";
import { handleDomainEvent } from "@/lib/events/handlers";

export async function dispatchOutboxByIds(ids: string[]) {
  for (const id of ids) {
    await dispatchOne(id);
  }
}

export async function dispatchPendingOutbox(limit = 50) {
  const rows = await prisma.outboxEvent.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  for (const row of rows) {
    await dispatchOne(row.id);
  }
}

async function dispatchOne(id: string) {
  const row = await prisma.outboxEvent.findUnique({ where: { id } });
  if (!row || row.status === "PROCESSED") return;

  try {
    const payload = JSON.parse(row.payload) as Record<string, unknown>;
    await handleDomainEvent(row.type, payload);
    await prisma.outboxEvent.update({
      where: { id },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
        attempts: { increment: 1 },
        lastError: null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.outboxEvent.update({
      where: { id },
      data: {
        status: "FAILED",
        attempts: { increment: 1 },
        lastError: message.slice(0, 500),
      },
    });
    throw err;
  }
}
