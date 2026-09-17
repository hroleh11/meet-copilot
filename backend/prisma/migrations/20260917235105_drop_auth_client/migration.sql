/*
  Warnings:

  - You are about to drop the column `client` on the `auth_sessions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "auth_sessions" DROP COLUMN "client";

-- DropEnum
DROP TYPE "AuthClient";
