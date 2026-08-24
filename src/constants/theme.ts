export const palette = {
  background: '#080A0D',
  surface: '#12151A',
  border: '#22262D',
  borderStrong: '#343A44',
  text: '#F6F7F9',
  muted: '#8D96A3',
  accent: '#4DA3FF',
  accentSoft: '#102A45',
  success: '#51D68A',
  successSoft: '#102C20',
  warning: '#F5B942',
  danger: '#FF5A67',
  dangerSoft: '#35181D',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

/** Shared design tokens. Screens should compose from these instead of inventing local values. */
export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
} as const;

export const type = {
  eyebrow: { fontSize: 11, fontWeight: '800' as const, letterSpacing: 1.5 },
  display: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -1 },
  title: { fontSize: 20, fontWeight: '800' as const, letterSpacing: -0.3 },
  body: { fontSize: 14, lineHeight: 20 },
  bodyStrong: { fontSize: 14, fontWeight: '700' as const, lineHeight: 20 },
  label: { fontSize: 10, fontWeight: '800' as const, letterSpacing: 1.2 },
  caption: { fontSize: 12, lineHeight: 17 },
  button: { fontSize: 15, fontWeight: '800' as const },
} as const;

export const layout = {
  pagePadding: spacing.lg,
  pageBottomPadding: 112,
  mainTabHeaderTop: spacing.md,
  mainTabHorizontal: spacing.lg,
  sectionGap: spacing.lg,
  cardPadding: spacing.md,
  controlHeight: 52,
} as const;
