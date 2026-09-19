-- AlterTable
ALTER TABLE "meetings" ADD COLUMN "overview" TEXT;

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_sessions_meeting_id_updated_at_idx" ON "chat_sessions"("meeting_id", "updated_at");

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN "session_id" TEXT;

-- Every meeting that already has questions keeps them in one chat
INSERT INTO "chat_sessions" ("id", "meeting_id", "title", "created_at", "updated_at")
SELECT gen_random_uuid(), "meeting_id", NULL, MIN("created_at"), MAX("created_at")
FROM "chat_messages"
GROUP BY "meeting_id";

UPDATE "chat_messages" AS m
SET "session_id" = s."id"
FROM "chat_sessions" AS s
WHERE s."meeting_id" = m."meeting_id";

-- AlterTable
ALTER TABLE "chat_messages" ALTER COLUMN "session_id" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_meeting_id_fkey";

-- DropIndex
DROP INDEX "chat_messages_meeting_id_created_at_idx";

-- AlterTable
ALTER TABLE "chat_messages" DROP COLUMN "meeting_id";

-- CreateIndex
CREATE INDEX "chat_messages_session_id_created_at_idx" ON "chat_messages"("session_id", "created_at");

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
