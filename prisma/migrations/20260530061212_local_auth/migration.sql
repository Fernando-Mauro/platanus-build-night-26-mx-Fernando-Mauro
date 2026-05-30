-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password_hash" TEXT,
ALTER COLUMN "cognito_id" DROP NOT NULL;
