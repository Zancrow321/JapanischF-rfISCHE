import { Colors, DEFAULT_DESIGN, DESIGN_EXTRAS, DESIGN_IDS, isDesignId } from '../designs';

describe('Designs', () => {
  it('startet mit dem dunklen Design (schwarz mit Rot)', () => {
    expect(DEFAULT_DESIGN).toBe('dunkel');
    expect(Colors.dunkel.background).toBe('#000000');
    expect(Colors.dunkel.accent).toBe('#FF5A6E');
  });

  it('hat für jedes Design dieselben Farbnamen', () => {
    const keys = Object.keys(Colors.dunkel).sort();
    for (const id of DESIGN_IDS) expect(Object.keys(Colors[id]).sort()).toEqual(keys);
  });

  it('erkennt nur bekannte Designs als gespeicherten Wert', () => {
    expect(isDesignId('retro')).toBe(true);
    expect(isDesignId('hell')).toBe(true);
    expect(isDesignId('pink')).toBe(false);
    expect(isDesignId(null)).toBe(false);
  });

  it('gibt nur dem Retro-Design Pixelschrift und Fensterrahmen', () => {
    expect(DESIGN_EXTRAS.retro.font).toBeDefined();
    expect(DESIGN_EXTRAS.retro.window.borderWidth).toBe(2);
    expect(DESIGN_EXTRAS.dunkel.font).toBeUndefined();
    expect(DESIGN_EXTRAS.hell.window).toEqual({});
  });
});
