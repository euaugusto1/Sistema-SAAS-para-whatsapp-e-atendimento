-- DropIndex
DROP INDEX "whatsapp_instances_api_key_key";

-- AlterTable
ALTER TABLE "whatsapp_instances" ALTER COLUMN "api_key" DROP NOT NULL;
