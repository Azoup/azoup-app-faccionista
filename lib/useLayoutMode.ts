import { useWindowDimensions } from 'react-native';

const SIDEBAR_BREAKPOINT = 768;

/** Desktop/tablet landscape: menu lateral fixo. Abaixo disso: drawer com hambúrguer. */
export function useLayoutMode(): 'sidebar' | 'drawer' {
  const { width } = useWindowDimensions();
  return width >= SIDEBAR_BREAKPOINT ? 'sidebar' : 'drawer';
}
