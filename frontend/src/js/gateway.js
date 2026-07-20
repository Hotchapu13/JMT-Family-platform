import '../styles/main.css';
import { validateCode, ApiError } from './api.js';

const form = document.querySelector('[data-gateway-form]');
const input = document.querySelector('#access-code');
const errorEl = document.querySelector('[data-gateway-error]');
const submit = document.querySelector('[data-gateway-submit]');
const submitLabel = document.querySelector('[data-submit-label]');

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
  input.classList.add('border-primary');
}

function clearError() {
  errorEl.classList.add('hidden');
  input.classList.remove('border-primary');
}

function setBusy(isBusy) {
  submit.disabled = isBusy;
  submit.classList.toggle('opacity-60', isBusy);
  submit.classList.toggle('pointer-events-none', isBusy);
  submitLabel.textContent = isBusy ? 'Unlocking…' : 'Enter the Archive';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError();

  const code = input.value.trim();
  if (!code) {
    showError('Please enter the access code you were given.');
    input.focus();
    return;
  }

  setBusy(true);
  try {
    await validateCode(code);
    // The viewer cookie is now set; return them wherever they were headed.
    const returnTo = sessionStorage.getItem('jmt:returnTo');
    sessionStorage.removeItem('jmt:returnTo');
    window.location.assign(returnTo || '/home.html');
  } catch (error) {
    setBusy(false);
    const message =
      error instanceof ApiError && error.status === 401
        ? error.message
        : 'We could not verify that code just now. Please try again.';
    showError(message);
    input.select();
  }
});

input.addEventListener('input', clearError);
