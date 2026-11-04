/**
 * Die Designs der App. „Dunkel“ ist der Standard: schwarzer Hintergrund mit Rot wie der Hinomaru.
 * „Retro-RPG“ erinnert an die Menüfenster alter Konsolen-Rollenspiele.
 */
import type { ViewStyle } from 'react-native';

const dunkel = {
  text: '#ffffff',
  background: '#000000',
  backgroundElement: '#212225',
  backgroundSelected: '#2E3135',
  textSecondary: '#B0B4BA',
  accent: '#FF5A6E',
  onAccent: '#ffffff',
  success: '#4CC38A',
  successSoft: '#13301F',
  accentSoft: '#3B1A20',
  border: '#3A3D42',
};

export const Colors = {
  dunkel,
  hell: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    accent: '#C8102E',
    onAccent: '#ffffff',
    success: '#1F8A4C',
    successSoft: '#DFF3E6',
    accentSoft: '#FBE3E6',
    border: '#D9D9E0',
  },
  retro: {
    text: '#ffffff',
    background: '#05061a',
    backgroundElement: '#16207a',
    backgroundSelected: '#4656c4',
    textSecondary: '#c9cbe0',
    accent: '#f2d06b',
    onAccent: '#0a1460',
    success: '#8cf0a8',
    successSoft: '#123d26',
    accentSoft: '#16207a',
    border: '#e6e8f2',
  },
} satisfies Record<string, typeof dunkel>;

export type DesignId = keyof typeof Colors;
export const DESIGN_IDS = Object.keys(Colors) as DesignId[];
export const DEFAULT_DESIGN: DesignId = 'dunkel';
export const isDesignId = (v: unknown): v is DesignId => typeof v === 'string' && v in Colors;

export const DESIGN_LABELS: Record<DesignId, string> = {
  dunkel: 'Dunkel',
  hell: 'Hell',
  retro: 'Retro-RPG',
};

/** Pixelschrift des Retro-Designs (mit japanischen Zeichen). */
export const RETRO_FONT = 'DotGothic16_400Regular';

/** Alles, was ein Design neben den Farben ausmacht. */
export type DesignExtras = {
  id: DesignId;
  dark: boolean;
  /** Schriftart für alle Texte; undefined = Systemschrift */
  font?: string;
  /** Zusatzstil für Fenster und Karten (Rahmen, Farbverlauf) */
  window: ViewStyle;
};

export const DESIGN_EXTRAS: Record<DesignId, DesignExtras> = {
  dunkel: { id: 'dunkel', dark: true, window: {} },
  hell: { id: 'hell', dark: false, window: {} },
  retro: {
    id: 'retro',
    dark: true,
    font: RETRO_FONT,
    window: {
      borderWidth: 2,
      borderColor: '#e6e8f2',
      borderRadius: 6,
      // Farbverlauf wie bei alten Menüfenstern (React Native ab 0.79, im Browser als CSS).
      backgroundImage: 'linear-gradient(180deg, #2a3db0 0%, #0a1460 100%)',
    } as ViewStyle,
  },
};

export type ThemeColor = keyof typeof dunkel;
export type Palette = typeof dunkel;
