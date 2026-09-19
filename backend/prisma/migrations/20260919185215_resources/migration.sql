-- CreateEnum
CREATE TYPE "ResourceScope" AS ENUM ('user', 'project', 'meeting');

-- CreateEnum
CREATE TYPE "ResourceKind" AS ENUM ('pdf', 'markdown', 'text');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('pending', 'ready', 'failed');

-- AlterEnum
ALTER TYPE "UsageKind" ADD VALUE 'digest';

-- AlterTable
ALTER TABLE "meetings" ADD COLUMN     "context_brief" TEXT;

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scope" "ResourceScope" NOT NULL,
    "project_id" TEXT,
    "meeting_id" TEXT,
    "kind" "ResourceKind" NOT NULL,
    "name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "storage_key" TEXT,
    "status" "ResourceStatus" NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "text" TEXT,
    "digest" TEXT,
    "chars" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resources_user_id_scope_created_at_idx" ON "resources"("user_id", "scope", "created_at");

-- CreateIndex
CREATE INDEX "resources_project_id_created_at_idx" ON "resources"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "resources_meeting_id_created_at_idx" ON "resources"("meeting_id", "created_at");

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
