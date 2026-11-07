import { db, schema, type Tx } from "@/db";

export async function audit(
  actorId: number | null,
  action: string,
  entity: string,
  entityId: string | number | null,
  data?: unknown,
  tx?: Tx,
) {
  await (tx ?? db).insert(schema.auditLog).values({
    actorId,
    action,
    entity,
    entityId: entityId == null ? null : String(entityId),
    data: data ?? null,
  });
}
