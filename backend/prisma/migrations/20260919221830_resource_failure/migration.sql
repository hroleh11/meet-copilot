-- CreateEnum
CREATE TYPE "ResourceFailure" AS ENUM ('unreadable', 'no_text_layer', 'storage');

-- AlterTable
ALTER TABLE "resources" DROP COLUMN "error",
ADD COLUMN     "failure" "ResourceFailure";

