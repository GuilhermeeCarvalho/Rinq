BEGIN;

ALTER TABLE "bets"
  ALTER COLUMN "fightId" DROP NOT NULL,
  ALTER COLUMN "chosenWinnerId" DROP NOT NULL,
  ADD COLUMN "mmaFightId" TEXT,
  ADD COLUMN "mmaTicket" JSONB;

-- Apostas antigas continuam legíveis mesmo após remover as lutas fictícias.
UPDATE "bets" AS b
SET "mmaFightId" = f.id,
    "mmaTicket" = jsonb_build_object(
      'fightId', f.id,
      'scheduledAt', to_char(f."scheduledAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'competitorA', jsonb_build_object('id', a.id, 'name', a.name),
      'competitorB', jsonb_build_object('id', c.id, 'name', c.name),
      'chosenWinnerId', b."chosenWinnerId",
      'oddA', f."oddA",
      'oddB', f."oddB",
      'outcome', CASE
        WHEN b.status = 'PENDING' OR NOT f."isFinished" THEN 'CANCELLED'
        WHEN f."winnerId" IS NULL THEN 'DRAW'
        ELSE 'WINNER'
      END,
      'winnerId', f."winnerId"
    ),
    "fightId" = NULL,
    "chosenWinnerId" = NULL
FROM "fights" f
JOIN "competitors" a ON a.id = f."competitorAId"
JOIN "competitors" c ON c.id = f."competitorBId"
WHERE b."fightId" = f.id AND f."seasonType" = 'HUMAN_MMA';

-- Cards locais não têm correspondência confiável com os confrontos da ESPN.
WITH refunded AS (
  UPDATE "bets"
  SET status = 'VOID', "settledAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
  WHERE "mmaFightId" IS NOT NULL AND status = 'PENDING'
  RETURNING "userId", amount
), credits AS (
  SELECT "userId", sum(amount)::integer AS coins FROM refunded GROUP BY "userId"
)
UPDATE "users" u
SET "virtualCoins" = u."virtualCoins" + credits.coins, "updatedAt" = CURRENT_TIMESTAMP
FROM credits
WHERE u.id = credits."userId";

DELETE FROM "fights" WHERE "seasonType" = 'HUMAN_MMA';
DELETE FROM "competitors" WHERE "seasonType" = 'HUMAN_MMA';

ALTER TABLE "bets" ADD CONSTRAINT "bets_source_check" CHECK (
  ("fightId" IS NOT NULL AND "chosenWinnerId" IS NOT NULL AND "mmaFightId" IS NULL AND "mmaTicket" IS NULL)
  OR
  ("fightId" IS NULL AND "chosenWinnerId" IS NULL AND "mmaFightId" IS NOT NULL AND "mmaTicket" IS NOT NULL)
);
ALTER TABLE "fights" ADD CONSTRAINT "fights_roosters_only" CHECK ("seasonType" = 'ROBOT_ROOSTER');
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_roosters_only" CHECK ("seasonType" = 'ROBOT_ROOSTER');
CREATE INDEX "bets_mmaFightId_status_idx" ON "bets"("mmaFightId", "status");

COMMIT;
