// Progressive enhancement of <LeadForm />. An Astro-processed module script (bundled, hashed by the CSP), loaded
// only on pages with a form. Without it a web3forms form is a plain POST and a whatsapp form is a plain link.
import { whatsappMessage, whatsappUrl } from './whatsapp';

const RATE_LIMIT = 429;

function status(form: HTMLFormElement, text: string): void {
  const region = form.querySelector<HTMLElement>('[data-form-status]');
  if (region) region.textContent = text;
}

function busy(form: HTMLFormElement, on: boolean): void {
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (button) button.disabled = on;
  form.toggleAttribute('aria-busy', on);
}

/** Web3Forms: FormData by fetch (never url-encoded: it answers a redirect and a CORS error), without `redirect`. */
async function sendWeb3Forms(form: HTMLFormElement): Promise<void> {
  const data = new FormData(form);
  data.delete('redirect');
  busy(form, true);
  status(form, form.dataset.msgSending ?? '');
  try {
    const response = await fetch(form.getAttribute('action') ?? '', {
      method: 'POST',
      body: data,
      headers: { Accept: 'application/json' },
    });
    if (response.status === RATE_LIMIT) {
      status(form, form.dataset.msgRate ?? '');
      return;
    }
    const body = (await response.json().catch(() => null)) as {
      success?: boolean;
    } | null;
    if (response.ok && body?.success !== false) {
      form.reset();
      status(form, form.dataset.msgSuccess ?? '');
    } else {
      status(form, form.dataset.msgError ?? '');
    }
  } catch {
    // Network error or a blocked request: the typed values stay in the form.
    status(form, form.dataset.msgError ?? '');
  } finally {
    busy(form, false);
  }
}

/** WhatsApp: compose the message from the fields and open wa.me; no request to any form service. */
function openWhatsApp(form: HTMLFormElement): void {
  const lines = [...form.querySelectorAll<HTMLElement>('[data-wa-label]')].map(
    (control) => ({
      label: control.dataset.waLabel ?? '',
      value: (control as HTMLInputElement).value ?? '',
    }),
  );
  const url = whatsappUrl(
    form.dataset.waNumber ?? '',
    whatsappMessage(form.dataset.waGreeting ?? '', lines),
  );
  status(form, form.dataset.msgSuccess ?? '');
  // An anchor click inside the submit gesture opens the tab without a popup block; window.open with noopener returns null.
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.click();
}

function enhance(form: HTMLFormElement): void {
  const provider = form.dataset.formProvider;
  if (provider === 'whatsapp') {
    // JavaScript runs: show the form and drop the plain link that stands in for it.
    form.hidden = false;
    form
      .closest('[data-lead-form-root]')
      ?.querySelector('[data-form-wa-link]')
      ?.remove();
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault(); // native validation already ran (required fields and the consent box)
    if (provider === 'whatsapp') openWhatsApp(form);
    else void sendWeb3Forms(form);
  });
}

document
  .querySelectorAll<HTMLFormElement>('form[data-lead-form]')
  .forEach(enhance);
