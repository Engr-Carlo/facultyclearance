import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export async function writeAuditLog(
  actorId: string,
  action: string,
  targetTable: string,
  targetId: string,
  metadata: Record<string, unknown>
) {
  await db.insert(auditLogs).values({
    actorId,
    action,
    targetTable,
    targetId,
    metadata,
  });
}
