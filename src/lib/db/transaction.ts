import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type TxClient = Prisma.TransactionClient;

export type DbContext = {
  tx: TxClient;
  /** Queue a domain event inside the open transaction (outbox pattern). */
  enqueue: (type: string, payload: Record<string, unknown>) => Promise<void>;
};

/**
 * Runs work inside a Prisma interactive transaction.
 * Domain events are enqueued on the outbox in the same transaction,
 * then dispatched after commit (event-driven side effects).
 */
export async function withTransaction<T>(
  work: (ctx: DbContext) => Promise<T>
): Promise<T> {
  const queuedIds: string[] = [];

  const result = await prisma.$transaction(async (tx) => {
    const enqueue = async (type: string, payload: Record<string, unknown>) => {
      const row = await tx.outboxEvent.create({
        data: {
          type,
          payload: JSON.stringify(payload),
          status: "PENDING",
        },
      });
      queuedIds.push(row.id);
    };
    return work({ tx, enqueue });
  });

  // Fire-and-forget after commit — never block the request on SMTP latency
  if (queuedIds.length > 0) {
    const { dispatchOutboxByIds } = await import("@/lib/events/dispatcher");
    void dispatchOutboxByIds(queuedIds).catch((err) =>
      console.error("[outbox] dispatch failed", err)
    );
  }

  return result;
}

export { prisma };
