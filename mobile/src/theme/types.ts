import type { ImageSourcePropType, TextStyle } from 'react-native'

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
  /** Status neutro/informativo (ex.: aposta estornada). */
  info: string
  overlay: string
  /** Sombra dos elementos elevados. Os temas atuais são chapados e usam 'transparent'. */
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
  brandMain: string
  brandSub: string
  tabFights: string
  /** Ícone (emoji) da aba de confrontos na barra inferior. */
  tabFightsIcon: string
  tabBets: string
  tabProfile: string
}

export interface ThemeTypography {
  fontFamily: TextStyle['fontFamily']
  displayTransform: TextStyle['textTransform']
  displayLetterSpacing: number
  displayWeight: TextStyle['fontWeight']
  bodyWeight: TextStyle['fontWeight']
  /** Fonte das odds e valores (com fontVariant tabular-nums nos componentes). */
  numericFontFamily: TextStyle['fontFamily']
  /** Fonte do corpo de texto. */
  bodyFontFamily: TextStyle['fontFamily']
}

export interface AppTheme {
  key: SeasonKey
  name: string
  /** Logotipo da temporada (substitui o texto brandMain/brandSub nos cabeçalhos). */
  logo: ImageSourcePropType
  /** Proporção largura/altura do logotipo, para dimensionar sem distorcer. */
  logoAspectRatio: number
  palette: ThemePalette
  dictionary: ThemeDictionary
  typography: ThemeTypography
  radii: { sm: number; md: number; lg: number; pill: number }
  spacing: (multiplier: number) => number
  statusBarStyle: 'light' | 'dark'
}
