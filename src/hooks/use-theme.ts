import type { ViewStyle } from 'react-native';

import { useDesign, type Theme } from '@/hooks/use-design';

export type { Theme };

/** Farben und Stil des gewählten Designs. */
export function useTheme(): Theme {
  return useDesign().theme;
}

/**
 * Stil für Fenster und Karten: die Hintergrundfarbe, im Retro-Design zusätzlich Rahmen und
 * Farbverlauf. Rückmeldungen (richtig/falsch) behalten ihre Farbe und bekommen nur den Rahmen.
 */
export function windowStyle(theme: Theme, color: string = theme.backgroundElement): ViewStyle {
  if (theme.id !== 'retro') return { backgroundColor: color };
  const { backgroundImage, ...frame } = theme.window as ViewStyle & { backgroundImage?: string };
  const isWindow = color === theme.backgroundElement || color === theme.accentSoft;
  return { backgroundColor: color, ...frame, ...(isWindow ? ({ backgroundImage } as ViewStyle) : {}) };
}
