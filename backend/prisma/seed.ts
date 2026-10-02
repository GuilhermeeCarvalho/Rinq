import { SeasonType, UserRole } from '../generated/prisma/enums.js'
import { prisma } from '../src/lib/prisma.js'
import { CompetitorModel } from '../src/models/CompetitorModel.js'
import { FightModel } from '../src/models/FightModel.js'
import { UserModel } from '../src/models/UserModel.js'
import type { CreateCompetitorInput } from '../src/models/CompetitorModel.js'
import { hashPassword } from '../src/lib/password.js'

type SeedCompetitor = Omit<CreateCompetitorInput, 'seasonType'>

const DEFAULT_MMA_ROSTER: SeedCompetitor[] = [
  {
    name: "Vinícius 'Machado' Torres",
    team: 'Chute Boxe',
    specWeight: 'Peso Médio · 84 kg',
    specStyle: 'Muay Thai',
    wins: 14,
    losses: 3,
    draws: 1,
  },
  {
    name: "Caio 'Pitbull' Ferrari",
    team: 'American Top Team',
    specWeight: 'Peso Médio · 84 kg',
    specStyle: 'Wrestling',
    wins: 10,
    losses: 6,
    draws: 0,
  },
]

const DEFAULT_ROOSTER_ROSTER: SeedCompetitor[] = [
  {
    name: "Carijó 'Fúria Caipira'",
    team: 'Cocheira Terra Roxa',
    specWeight: 'Porte Médio · 3.8 kg',
    specStyle: 'Espora de Fibra',
    wins: 14,
    losses: 2,
    draws: 0,
  },
  {
    name: "Trovão 'Bico de Prata'",
    team: 'Criatório São Judas',
    specWeight: 'Porte Médio · 3.8 kg',
    specStyle: 'Golpe Veloz',
    wins: 10,
    losses: 5,
    draws: 1,
  },
]

async function reset(): Promise<void> {
  await prisma.bet.deleteMany()
  await prisma.fight.deleteMany()
  await prisma.competitor.deleteMany()
  await prisma.user.deleteMany()
}

async function seedSeason(seasonType: SeasonType, roster: SeedCompetitor[]): Promise<void> {
  const competitors = []
  for (const entry of roster) {
    competitors.push(await CompetitorModel.create({ ...entry, seasonType }))
  }

  const competitorA = competitors[0]
  const competitorB = competitors[1]
  if (competitorA && competitorB) {
    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await FightModel.create({
      competitorAId: competitorA.id,
      competitorBId: competitorB.id,
      seasonType,
      scheduledAt,
    })
  }
}

async function main(): Promise<void> {
  await reset()

  await UserModel.create({
    name: 'Apostador Demo',
    email: 'demo@rinq.app',
    passwordHash: await hashPassword('player123'),
    role: UserRole.PLAYER,
  })

  await UserModel.create({
    name: 'Administrador Rinq',
    email: process.env['ADMIN_EMAIL'] ?? 'admin@rinq.app',
    passwordHash: await hashPassword(process.env['ADMIN_PASSWORD'] ?? 'admin12345'),
    role: UserRole.ADMIN,
  })

  await seedSeason(SeasonType.HUMAN_MMA, DEFAULT_MMA_ROSTER)
  await seedSeason(SeasonType.ROBOT_ROOSTER, DEFAULT_ROOSTER_ROSTER)

  const [competitors, fights, users] = await Promise.all([
    prisma.competitor.count(),
    prisma.fight.count(),
    prisma.user.count(),
  ])

  console.log(`Seed concluído: ${users} usuários, ${competitors} competidores, ${fights} lutas.`)
}

main()
  .catch((error: unknown) => {
    console.error('Seed falhou:', error)
    process.exitCode = 1
  })
  .finally(() => {
    void prisma.$disconnect()
  })
