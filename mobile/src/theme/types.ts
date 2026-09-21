import type { TextStyle } from 'react-native'

/** Mesma chave do enum SeasonType do backend. */
export type SeasonKey = 'HUMAN_MMA' | 'ROBOT_ROOSTER'

export interface ThemePalette {
  background: string
  surface: string
  surfaceAlt: string
  border: string
  primary: string
  primaryContrast: string
  accent: string
  text: string
  textMuted: string
  success: string
  danger: string
  overlay: string
  /** Brilho externo dos cards — o tema neon usa, o de MMA quase não. */
  glow: string
}

/**
 * Dicionário sazonal: é isto que faz "Lutador" virar "Galo-Robô"
 * sem tocar em uma linha de backend.
 */
export interface ThemeDictionary {
  seasonBadge: string
  arena: string
  cardTitle: string
  cardSubtitle: string
  competitor: string
  competitorPlural: string
  team: string
  weightSpec: string
  styleSpec: string
  record: string
  recordShort: string
  versus: string
  betAction: string
  betSheetTitle: string
  betAmountLabel: string
  potentialReturn: string
  balance: string
  balanceShort: string
  confirmBet: string
  cancel: string
  emptyState: string
  loading: string
  finished: string
  winner: string
  draw: string
  betPlaced: string
  updateAvailable: string
  updateApplying: string
}

export interface ThemeTypography {
  fontFamily: TextStyle['fontFamily']
  displayTransform: TextStyle['textTransform']
  displayLetterSpacing: number
  displayWeight: TextStyle['fontWeight']
  bodyWeight: TextStyle['fontWeight']
  /** Estilo das odds — o tema robô usa monoespaçado. */
  numericFontFamily: TextStyle['fontFamily']
}

export interface AppTheme {
  key: SeasonKey
  name: string
  tagline: string
  palette: ThemePalette
  dictionary: ThemeDictionary
  typography: ThemeTypography
  radii: { sm: number; md: number; lg: number; pill: number }
  spacing: (multiplier: number) => number
  statusBarStyle: 'light' | 'dark'
}
