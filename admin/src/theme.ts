import type { Season } from './types'
import logoMma from './assets/logo-mma.png'
import logoGalos from './assets/logo-galos.png'

/**
 * Espelha os temas do app mobile (mobile/src/theme/mmaTheme.ts e roosterTheme.ts).
 * Se mudar paleta, tipografia ou raios lá, atualize aqui também.
 */
export interface AdminTheme {
  key: Season
  name: string
  /** Logotipo da temporada (sidebar e login). */
  logo: string
  palette: {
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
    info: string
    overlay: string
    glow: string
  }
  typography: {
    displayFont: string
    displayWeight: number
    displayLetterSpacing: number
    displayTransform: 'uppercase' | 'none'
    bodyFont: string
  }
  colorScheme: 'dark' | 'light'
  radii: { sm: number; md: number; lg: number; pill: number }
  /** Vocabulário da temporada, igual ao dicionário do app (mobile/src/theme/*Theme.ts). */
  dictionary: {
    seasonBadge: string
    competitor: string
    team: string
    weightSpec: string
    styleSpec: string
    placeholders: { name: string; team: string; weight: string; style: string }
    /** Sugestões de autocomplete para o campo de peso/categoria. Ausente = campo livre. */
    weightOptions?: string[]
  }
}

const SYSTEM_BODY_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

export const THEMES: Record<Season, AdminTheme> = {
  // Pôster de luta: quase preto neutro, vermelho só nos pontos-chave.
  HUMAN_MMA: {
    key: 'HUMAN_MMA',
    name: 'Rinq MMA',
    logo: logoMma,
    palette: {
      background: '#111111',
      surface: '#1A1A1A',
      surfaceAlt: '#232323',
      border: '#2F2F2F',
      primary: '#D7261E',
      primaryContrast: '#FFFFFF',
      accent: '#D9CBA3',
      text: '#ECECEC',
      textMuted: '#8E8E8E',
      success: '#5BAE6E',
      danger: '#E5484D',
      info: '#7FA6C7',
      overlay: 'rgba(0,0,0,0.7)',
      glow: 'transparent',
    },
    typography: {
      displayFont: "'Archivo Narrow', 'Arial Narrow', sans-serif-condensed, sans-serif",
      displayWeight: 700,
      displayLetterSpacing: 0.5,
      displayTransform: 'uppercase',
      bodyFont: SYSTEM_BODY_FONT,
    },
    colorScheme: 'dark',
    radii: { sm: 2, md: 4, lg: 6, pill: 4 },
    dictionary: {
      seasonBadge: 'Temporada MMA',
      competitor: 'Lutador',
      team: 'Academia',
      weightSpec: 'Categoria',
      styleSpec: 'Estilo',
      placeholders: {
        name: 'Ex.: Rafael "Trovão" Lima',
        team: 'Ex.: Nova União',
        weight: 'Ex.: Peso-leve',
        style: 'Ex.: Jiu-jítsu',
      },
      weightOptions: [
        'Peso-palha',
        'Peso-mosca',
        'Peso-galo',
        'Peso-pena',
        'Peso-leve',
        'Peso-meio-médio',
        'Peso-médio',
        'Peso-meio-pesado',
        'Peso-pesado',
        'Peso-palha feminino',
        'Peso-mosca feminino',
        'Peso-galo feminino',
        'Peso-pena feminino',
      ],
    },
  },
  // Papel de cordel: fundo creme, tinta marrom, terracota como destaque.
  ROBOT_ROOSTER: {
    key: 'ROBOT_ROOSTER',
    name: 'Circuito Galos',
    logo: logoGalos,
    palette: {
      background: '#120E0B',
      surface: '#1E1712',
      surfaceAlt: '#2A2019',
      border: '#423327',
      primary: '#E58B20',
      primaryContrast: '#120E0B',
      accent: '#F5BD47',
      text: '#F7F2EB',
      textMuted: '#A89789',
      success: '#5FA35A',
      danger: '#D9453B',
      info: '#70A4CF',
      overlay: 'rgba(18,14,11,0.82)',
      glow: 'rgba(229,139,32,0.18)',
    },
    typography: {
      displayFont: "'Alegreya', Georgia, serif",
      displayWeight: 700,
      displayLetterSpacing: 0,
      displayTransform: 'none',
      bodyFont: SYSTEM_BODY_FONT,
    },
    colorScheme: 'dark',
    radii: { sm: 4, md: 8, lg: 14, pill: 999 },
    dictionary: {
      seasonBadge: 'Circuito Galo Raiz',
      competitor: 'Galo',
      team: 'Cocheira / Criatório',
      weightSpec: 'Porte / Peso',
      styleSpec: 'Especialidade / Espora',
      placeholders: {
        name: 'Ex.: Carijó de Ferro',
        team: 'Ex.: Criatório Serra Alta',
        weight: 'Ex.: Pesado (3,2 kg)',
        style: 'Ex.: Espora de aço',
      },
    },
  },
}

/** Publica o tema como CSS custom properties no <html>. */
export function applyTheme(season: Season) {
  const { palette, typography, radii, colorScheme } = THEMES[season]
  const root = document.documentElement
  const vars: Record<string, string> = {
    '--background': palette.background,
    '--surface': palette.surface,
    '--surface-alt': palette.surfaceAlt,
    '--border': palette.border,
    '--primary': palette.primary,
    '--primary-contrast': palette.primaryContrast,
    '--accent': palette.accent,
    '--text': palette.text,
    '--text-muted': palette.textMuted,
    '--success': palette.success,
    '--danger': palette.danger,
    '--info': palette.info,
    '--overlay': palette.overlay,
    '--glow': palette.glow,
    '--display-font': typography.displayFont,
    '--display-weight': String(typography.displayWeight),
    '--display-spacing': `${typography.displayLetterSpacing}px`,
    '--display-transform': typography.displayTransform,
    '--body-font': typography.bodyFont,
    '--radius-sm': `${radii.sm}px`,
    '--radius-md': `${radii.md}px`,
    '--radius-lg': `${radii.lg}px`,
    '--radius-pill': `${radii.pill}px`,
  }
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value)
  root.style.colorScheme = colorScheme
  root.dataset.season = season
}
