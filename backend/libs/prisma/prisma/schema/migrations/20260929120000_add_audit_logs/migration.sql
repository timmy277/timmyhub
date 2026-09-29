CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" TEXT NOT NULL,
    "actorIp" TEXT,
    "userAgent" TEXT,
    "before" JSONB,
    "after" JSONB,
    "result" TEXT NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_entityType_entityId_occurredAt_idx"
ON "audit_logs"("entityType", "entityId", "occurredAt" DESC);

CREATE INDEX "audit_logs_actorId_occurredAt_idx"
ON "audit_logs"("actorId", "occurredAt" DESC);
