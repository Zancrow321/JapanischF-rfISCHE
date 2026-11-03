import * as Speech from 'expo-speech';

let japaneseVoice: Promise<boolean> | null = null;

/** Prüft einmalig, ob das Gerät eine japanische Stimme hat. */
export function hasJapaneseVoice(): Promise<boolean> {
  japaneseVoice ??= Speech.getAvailableVoicesAsync()
    .then((voices) => voices.some((v) => v.language?.toLowerCase().startsWith('ja')))
    .catch(() => false);
  return japaneseVoice;
}

/** Spricht japanischen Text aus (Kana oder Kanji). */
export function speakJapanese(text: string): void {
  Speech.stop();
  Speech.speak(text, { language: 'ja-JP', rate: 0.8 });
}
