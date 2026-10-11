// Logic for the human-check page served by netlify/edge-functions/gate.ts.
// Kept as an external file (no inline scripts) so it works with the strict CSP in public/_headers.
const widget = document.querySelector('altcha-widget');
const statusEl = document.getElementById('human-status');
const form = document.getElementById('human-form');
let sending = false;

function say(message, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = isError ? 'err' : '';
}

function readPayload(event) {
  const fromEvent = event?.detail?.payload;
  if (fromEvent) return fromEvent;
  const field = form?.querySelector('input[name="altcha"]');
  return field?.value || '';
}

async function send(payload) {
  if (sending || !payload) return;
  sending = true;
  say('מאמת...');
  try {
    const response = await fetch('/api/human', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ payload }),
    });
    if (response.ok) {
      say('אומת. נכנסים...');
      location.reload();
      return;
    }
    say(response.status === 429 ? 'יותר מדי ניסיונות. נסה שוב בעוד כמה דקות.' : 'האימות נכשל. נסה שוב.', true);
  } catch {
    say('אין חיבור לשרת. נסה שוב.', true);
  }
  sending = false;
  widget?.reset?.();
}

window.addEventListener('load', () => {
  if (!widget) return;
  widget.addEventListener('statechange', (event) => {
    const state = event?.detail?.state;
    if (state === 'verifying') say('בודק...');
    else if (state === 'verified') send(readPayload(event));
    else if (state === 'error') say('משהו השתבש באימות. רענן את הדף ונסה שוב.', true);
    else if (state === 'expired') say('פג תוקף האימות. מרענן...');
  });
});
