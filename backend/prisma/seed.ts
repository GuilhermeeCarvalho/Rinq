/**
 * Seed do Rinq.app — popula as duas temporadas de uma vez.
 * As odds não são digitadas à mão: saem do OddsService (RF04).
 *
 *   npm run db:seed
 */
import { SeasonType } from '../generated/prisma/enums.js'
import { prisma } from '../src/lib/prisma.js'
import { CompetitorModel } from '../src/models/CompetitorModel.js'
import { FightModel } from '../src/models/FightModel.js'
import { UserModel } from '../src/models/UserModel.js'
import type { CreateCompetitorInput } from '../src/models/CompetitorModel.js'

type SeedCompetitor = Omit<CreateCompetitorInput, 'seasonType'>

/** Temporada 1 — MMA humano: academia, categoria de peso, estilo, cartel. */
const MMA_ROSTER: SeedCompetitor[] = [
  { name: "Vinícius 'Machado' Torres", team: 'Chute Boxe Diadema', specWeight: 'Peso Médio · 84 kg', specStyle: 'Muay Thai', wins: 14, losses: 3, draws: 1 },
  { name: "Caio 'Pitbull' Ferrari", team: 'American Top Team', specWeight: 'Peso Médio · 84 kg', specStyle: 'Wrestling', wins: 10, losses: 6, draws: 0 },
  { name: "Rafael 'Anaconda' Bastos", team: 'Nova União', specWeight: 'Peso Leve · 70 kg', specStyle: 'Jiu-Jitsu', wins: 11, losses: 5, draws: 0 },
  { name: "Douglas 'Relâmpago' Prado", team: 'Astra Fight Team', specWeight: 'Peso Leve · 70 kg', specStyle: 'Boxe', wins: 17, losses: 4, draws: 2 },
  { name: "Igor 'Britadeira' Salgado", team: 'American Top Team', specWeight: 'Peso Pesado · 120 kg', specStyle: 'Ground and Pound', wins: 9, losses: 2, draws: 0 },
  { name: "Bruno 'Muralha' Kessler", team: 'Team Nogueira', specWeight: 'Peso Pesado · 120 kg', specStyle: 'Luta Livre', wins: 7, losses: 7, draws: 1 },
  { name: "Marcelo 'Serrote' Vidal", team: 'Nova União', specWeight: 'Peso Galo · 61 kg', specStyle: 'Karatê Kyokushin', wins: 12, losses: 1, draws: 0 },
  { name: "Léo 'Nitro' Andrade", team: 'Astra Fight Team', specWeight: 'Peso Galo · 61 kg', specStyle: 'Capoeira Adaptada', wins: 5, losses: 2, draws: 3 },
]

/** Temporada 2 — Galos-Robô: laboratório, classe de chassi, armamento, danos. */
const ROBOT_ROSTER: SeedCompetitor[] = [
  { name: 'GALLUS-9', team: 'Lab. Ferro-Velho', specWeight: 'Classe Bantam · 28 kg', specStyle: 'Esporas de Titânio', wins: 15, losses: 2, draws: 0 },
  { name: 'PENA-FANTASMA', team: 'Cybernetic Coop', specWeight: 'Classe Bantam · 28 kg', specStyle: 'Serra Circular Dorsal', wins: 9, losses: 4, draws: 1 },
  { name: 'KRAKATOA-MK3', team: 'Vulcano Robotics', specWeight: 'Classe Média · 45 kg', specStyle: 'Lança-Chamas Peitoral', wins: 11, losses: 3, draws: 2 },
  { name: 'BICO-DE-AÇO', team: 'Oficina Aurora', specWeight: 'Classe Média · 45 kg', specStyle: 'Broca Pneumática', wins: 13, losses: 6, draws: 0 },
  { name: 'TITAN-ROOSTER', team: 'Hangar 51', specWeight: 'Classe Pesada · 72 kg', specStyle: 'Martelo Hidráulico', wins: 8, losses: 1, draws: 1 },
  { name: 'ELECTRO-CRISTA', team: 'Neon Labs', specWeight: 'Classe Pesada · 72 kg', specStyle: 'Descarga de Alta Tensão', wins: 6, losses: 5, draws: 0 },
  { name: 'SPUR-X', team: 'Cybernetic Coop', specWeight: 'Classe Leve · 35 kg', specStyle: 'Garras Retráteis', wins: 4, losses: 4, draws: 2 },
  { name: 'CINZA-ZERO', team: 'Vulcano Robotics', specWeight: 'Classe Leve · 35 kg', specStyle: 'Rede Eletrificada', wins: 2, losses: 1, draws: 0 },
]

const SEED_USERS = [
  { name: 'Apostador Demo', email: 'demo@rinq.app' },
  { name: 'Marina Vasques', email: 'marina@rinq.app' },
  { name: 'Téo Almeida', email: 'teo@rinq.app' },
]

/** Limpa na ordem inversa das dependências. */
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

  // Confrontos entre vizinhos da lista: cada par compartilha a mesma
  // categoria de peso / classe de chassi.
  const now = Date.now()
  let index = 0
  for (let i = 0; i + 1 < competitors.length; i += 2) {
    const competitorA = competitors[i]
    const competitorB = competitors[i + 1]
    if (!competitorA || !competitorB) continue

    const fight = await FightModel.create({
      competitorAId: competitorA.id,
      competitorBId: competitorB.id,
      seasonType,
      // Um card por dia, a partir de amanhã.
      scheduledAt: new Date(now + (index + 1) * 24 * 60 * 60 * 1000),
    })

    console.log(
      `  ${competitorA.name} (${fight.oddA.toFixed(2)})  vs  ${competitorB.name} (${fight.oddB.toFixed(2)})`,
    )
    index += 1
  }
}

async function main(): Promise<void> {
  console.log('🧹 Limpando base...')
  await reset()

  console.log('👤 Criando apostadores (1500 moedas cada)...')
  for (const user of SEED_USERS) {
    const created = await UserModel.create(user)
    console.log(`  ${created.name} <${created.email}> — ${created.virtualCoins} moedas — id=${created.id}`)
  }

  console.log('\n🥊 Temporada HUMAN_MMA')
  await seedSeason(SeasonType.HUMAN_MMA, MMA_ROSTER)

  console.log('\n🤖 Temporada ROBOT_ROOSTER')
  await seedSeason(SeasonType.ROBOT_ROOSTER, ROBOT_ROSTER)

  const [competitors, fights, users] = await Promise.all([
    prisma.competitor.count(),
    prisma.fight.count(),
    prisma.user.count(),
  ])
  console.log(`\n✅ Seed concluído: ${users} usuários, ${competitors} competidores, ${fights} lutas.`)
}

main()
  .catch((error: unknown) => {
    console.error('❌ Seed falhou:', error)
    process.exitCode = 1
  })
  .finally(() => {
    void prisma.$disconnect()
  })
