/*
  Warnings:

  - You are about to drop the column `cache_creation_tokens` on the `generations` table. All the data in the column will be lost.
  - You are about to drop the column `cache_read_tokens` on the `generations` table. All the data in the column will be lost.
  - You are about to drop the column `cache_creation_tokens` on the `usage_events` table. All the data in the column will be lost.
  - You are about to drop the column `cache_read_tokens` on the `usage_events` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "generations" DROP COLUMN "cache_creation_tokens",
DROP COLUMN "cache_read_tokens",
ADD COLUMN     "cached_input_tokens" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "usage_events" DROP COLUMN "cache_creation_tokens",
DROP COLUMN "cache_read_tokens",
ADD COLUMN     "cached_input_tokens" INTEGER NOT NULL DEFAULT 0;
