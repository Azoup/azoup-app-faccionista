/** Paleta alinhada a KANBAN_PRODUCAO_E_DESIGN.md (modo escuro padrão Azoup). */
export const darkTheme = {
  primary: '#FF8B17',
  secondary: '#E8E8FF',
  background: '#0D0D1A',
  surface: '#161628',
  surfaceVariant: '#1E1E35',
  surfaceElevated: '#22223C',
  text: '#E8E8FF',
  textSecondary: '#9898BB',
  textMuted: '#66667A',
  border: '#2A2A45',
  error: '#FF6B6B',
  success: '#4ADE80',
  successSurface: '#14291F',
  textOnPrimary: '#FFFFFF',
} as const;

export type Theme = typeof darkTheme;
