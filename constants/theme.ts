/** Paleta alinhada a KANBAN_PRODUCAO_E_DESIGN.md */

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

export const lightTheme = {
  primary: '#FF8B17',
  secondary: '#0F0F41',
  background: '#F7F7F7',
  surface: '#FFFFFF',
  surfaceVariant: '#F0F0F0',
  surfaceElevated: '#FFFFFF',
  text: '#0F0F41',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#EFEFEF',
  error: '#FF0000',
  success: '#166534',
  successSurface: '#F0FDF4',
  textOnPrimary: '#FFFFFF',
} as const;

export type Theme = typeof darkTheme;

export function themeForMode(isDark: boolean): Theme {
  return isDark ? darkTheme : lightTheme;
}
