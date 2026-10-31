import { getLang } from './i18n.js';

const h = React.createElement;
const useState = React.useState as <T>(value: T) => [T, (next: T | ((previous: T) => T)) => void];
const useEffect = React.useEffect as (effect: () => void | (() => void), deps: unknown[]) => void;
const useRef = React.useRef as <T>(value: T) => { current: T };

type CopyState = 'idle' | 'copied' | 'failed';

const COPIED_MS = 1500;
const TEXT = {
  he: { label: 'FEN', copy: 'העתק', copied: 'הועתק ✓', failed: 'ההעתקה נכשלה. סמן את הטקסט והעתק ידנית.', aria: 'FEN של העמדה על הלוח' },
  en: { label: 'FEN', copy: 'Copy', copied: 'Copied ✓', failed: 'Copy failed. Select the text and copy it manually.', aria: 'FEN of the position on the board' },
};

export function copyFenWithSelection(input: HTMLInputElement | null): boolean {
  if (!input) return false;
  try {
    input.focus();
    input.select();
    input.setSelectionRange(0, input.value.length);
    return document.execCommand('copy') === true;
  } catch {
    return false;
  }
}

export async function copyFenText(fen: string, input: HTMLInputElement | null): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(fen);
      return true;
    }
  } catch {
    // Fall through to the selection-based copy.
  }
  return copyFenWithSelection(input);
}

export function FenBox({ fen }: { fen: string }) {
  const en = getLang() === 'en';
  const t = en ? TEXT.en : TEXT.he;
  const [state, setState] = useState<CopyState>('idle');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  useEffect(() => { setState('idle'); }, [fen]);

  async function onCopy() {
    const ok = await copyFenText(fen, inputRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
    setState(ok ? 'copied' : 'failed');
    if (ok) timerRef.current = setTimeout(() => setState('idle'), COPIED_MS);
  }

  return h('div', { className: 'fen-box' },
    h('div', { className: 'fen-box-head' },
      h('label', { className: 'fen-box-label', htmlFor: 'fen-box-input' }, t.label),
      h('button', { type: 'button', className: 'fen-box-copy', onClick: onCopy }, state === 'copied' ? t.copied : t.copy)
    ),
    h('input', {
      id: 'fen-box-input',
      ref: inputRef,
      className: 'fen-box-input',
      type: 'text',
      dir: 'ltr',
      readOnly: true,
      value: fen,
      spellCheck: false,
      'aria-label': t.aria,
      onFocus: (e: { target: HTMLInputElement }) => e.target.select(),
    }),
    state === 'failed' && h('small', { className: 'fen-box-error', role: 'alert' }, t.failed)
  );
}
