import '../styles/main.css';
import { adminLogin, ApiError } from './api.js';

const form = document.querySelector('[data-admin-login-form]');
const usernameInput = document.querySelector('#admin-username');
const passwordInput = document.querySelector('#admin-password');
const errorEl = document.querySelector('[data-admin-login-error]');
const submit = document.querySelector('[data-admin-login-submit]');
const submitLabel = document.querySelector('[data-submit-label]');

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

function clearError() {
  errorEl.classList.add('hidden');
}

function setBusy(isBusy) {
  submit.disabled = isBusy;
  submit.classList.toggle('opacity-60', isBusy);
  submit.classList.toggle('pointer-events-none', isBusy);
  submitLabel.textContent = isBusy ? 'Signing in…' : 'Sign In';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if (!username || !password) {
    showError('Enter both your username and password.');
    return;
  }

  setBusy(true);
  try {
    await adminLogin(username, password);
    window.location.assign('/admin.html');
  } catch (error) {
    setBusy(false);
    const message =
      error instanceof ApiError && error.status === 401
        ? error.message
        : 'Could not sign in just now. Please try again.';
    showError(message);
    passwordInput.select();
  }
});

[usernameInput, passwordInput].forEach((el) => el.addEventListener('input', clearError));
