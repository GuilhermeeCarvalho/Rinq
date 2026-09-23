-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLAYER', 'ADMIN');

-- AddColumns
ALTER TABLE "users" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'PLAYER';

-- Remove temporary default after existing rows have been migrated by the seed.
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP DEFAULT;