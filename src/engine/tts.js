// Read-aloud with the browser's speechSynthesis. Nothing is ever spoken automatically: each button speaks its
// text only when pressed (and stops when pressed again). Hidden entirely when the browser has no speech support.
import { h } from './dom.js';
import { t, getLang } from './i18n.js';

export const ttsSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';

let current = null; // the button currently speaking

function reset(b) { if (!b) return; b.classList.remove('speaking'); b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', t('readAloud')); b.title = t('readAloud'); }

export function stopSpeaking() {
  try { if (ttsSupported()) window.speechSynthesis.cancel(); } catch { /* */ }
  reset(current); current = null;
}

/** A small "listen" button for `getText()` (string or function). Returns null when unsupported. */
export function speakButton(getText, extraClass = '') {
  if (!ttsSupported()) return null;
  const b = h('button', { type: 'button', class: `tts-btn${extraClass ? ` ${extraClass}` : ''}`, 'aria-pressed': 'false', 'aria-label': t('readAloud'), title: t('readAloud') },
    h('span', { 'aria-hidden': 'true' }, '🔊'));
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (current === b) { stopSpeaking(); return; }
    stopSpeaking();
    const text = String(typeof getText === 'function' ? getText() : getText || '').trim();
    if (!text) return;
    try {
      const u = new window.SpeechSynthesisUtterance(text);
      // the voice follows the script of the text (an Arabic line in the English UI is still read in Arabic)
      const lang = /[؀-ۿ]/.test(text) ? 'ar-SA' : getLang() === 'ar' && !/[a-z]/i.test(text) ? 'ar-SA' : 'en-US';
      u.lang = lang;
      const voice = window.speechSynthesis.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith(lang.slice(0, 2)));
      if (voice) u.voice = voice;
      u.rate = 0.95;
      u.onend = u.onerror = () => { if (current === b) { reset(b); current = null; } };
      current = b;
      b.classList.add('speaking'); b.setAttribute('aria-pressed', 'true'); b.setAttribute('aria-label', t('stopReading')); b.title = t('stopReading');
      window.speechSynthesis.speak(u);
    } catch { reset(b); current = null; }
  });
  return b;
}
