import type { SeasonType } from '../../generated/prisma/enums.js'

export interface SeasonDTO {
  /** Chave lida pelo ThemeContext do app para escolher a paleta/dicionário. */
  seasonType: SeasonType
  label: string
  endsAt: string | null
  /** Canal EAS Update correspondente — apenas informativo para o app. */
  easChannel: string | null
  serverTime: string
}

const DEFAULT_LABELS: Record<SeasonType, string> = {
  HUMAN_MMA: 'Temporada MMA',
  ROBOT_ROOSTER: 'Temporada Galos-Robô',
}

/** RF06 — contrato mínimo que dirige a troca sazonal de tema no app. */
export class SeasonView {
  static render(input: {
    seasonType: SeasonType
    label: string | null
    endsAt: string | null
    easChannel: string | null
  }): SeasonDTO {
    return {
      seasonType: input.seasonType,
      label: input.label ?? DEFAULT_LABELS[input.seasonType],
      endsAt: input.endsAt,
      easChannel: input.easChannel,
      serverTime: new Date().toISOString(),
    }
  }
}
