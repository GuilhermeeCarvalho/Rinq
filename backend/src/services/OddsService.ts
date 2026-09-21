/**
 * RF04 — Motor de odds determinístico.
 *
 * Regras de negócio puras (sem Prisma, sem HTTP), idênticas nas duas
 * temporadas: só o histórico V-E-D entra na conta.
 *
 *  1. força  = (V + 0.5·E + 1) / (total + 2)      ← suavização de Laplace
 *  2. prob.  = força / soma das forças            ← normalização
 *  3. clamp  = [5%, 95%]                          ← evita odds absurdas
 *  4. odd    = 1 / (prob · (1 + MARGEM))          ← margem da casa de 10%
 *  5. piso   = MIN_ODD (1.05)
 */

/** Margem da casa: o overround somado das odds fica em ~110%. */
export const HOUSE_MARGIN = 0.1

/** Odd mínima paga pela casa. */
export const MIN_ODD = 1.05

const MIN_PROBABILITY = 0.05
const MAX_PROBABILITY = 0.95

export interface CompetitorRecord {
  wins: number
  losses: number
  draws: number
}

export interface OddsPair {
  oddA: number
  oddB: number
}

export interface OddsBreakdown extends OddsPair {
  probabilityA: number
  probabilityB: number
  margin: number
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export class OddsService {
  /**
   * Força relativa do competidor. A suavização mantém estreantes (0-0-0)
   * em 0.5 em vez de gerar divisão por zero.
   */
  static strength(record: CompetitorRecord): number {
    const total = record.wins + record.losses + record.draws
    const score = record.wins + record.draws * 0.5
    return (score + 1) / (total + 2)
  }

  /** Probabilidades justas (sem margem), somando 1. */
  static probabilities(
    recordA: CompetitorRecord,
    recordB: CompetitorRecord,
  ): { probabilityA: number; probabilityB: number } {
    const strengthA = OddsService.strength(recordA)
    const strengthB = OddsService.strength(recordB)
    const rawProbabilityA = strengthA / (strengthA + strengthB)

    const probabilityA = clamp(rawProbabilityA, MIN_PROBABILITY, MAX_PROBABILITY)

    return {
      probabilityA: round(probabilityA, 4),
      probabilityB: round(1 - probabilityA, 4),
    }
  }

  /** Converte uma probabilidade justa em odd decimal com margem da casa. */
  static toDecimalOdd(probability: number): number {
    const safeProbability = clamp(probability, MIN_PROBABILITY, MAX_PROBABILITY)
    const odd = 1 / (safeProbability * (1 + HOUSE_MARGIN))
    return round(Math.max(odd, MIN_ODD), 2)
  }

  /** Par de odds pronto para gravar no card de luta. */
  static buildOdds(recordA: CompetitorRecord, recordB: CompetitorRecord): OddsBreakdown {
    const { probabilityA, probabilityB } = OddsService.probabilities(recordA, recordB)

    return {
      probabilityA,
      probabilityB,
      oddA: OddsService.toDecimalOdd(probabilityA),
      oddB: OddsService.toDecimalOdd(probabilityB),
      margin: HOUSE_MARGIN,
    }
  }

  /** RF05: projeção de retorno bruto da aposta. */
  static potentialPayout(amount: number, odd: number): number {
    return round(amount * odd, 2)
  }

  /** Crédito efetivo em moedas (inteiras) quando a aposta é vencedora. */
  static payoutInCoins(potentialPayout: number): number {
    return Math.round(potentialPayout)
  }

  /** Overround real das odds gravadas — usado em testes/diagnóstico. */
  static impliedMargin(oddA: number, oddB: number): number {
    return round(1 / oddA + 1 / oddB - 1, 4)
  }
}
