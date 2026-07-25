import '../styles/main.css';
import { requireSession, submitStory, ApiError } from './api.js';
import { mountChrome } from './layout.js';

mountChrome('story-submit');

requireSession().catch(() => {
  /* Network hiccups shouldn't blank a page that needs no data to render. */
});

const form = document.querySelector('[data-story-submit-form]');
const errorEl = document.querySelector('[data-story-submit-error]');
const successEl = document.querySelector('[data-story-submit-success]');
const submitButton = document.querySelector('[data-story-submit-button]');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorEl.classList.add('hidden');
  successEl.classList.add('hidden');

  const formData = new FormData();
  formData.append('title', document.querySelector('#submit-title').value.trim());
  formData.append('category', document.querySelector('#submit-category').value.trim());
  formData.append('year_label', document.querySelector('#submit-year').value.trim());
  formData.append('excerpt', document.querySelector('#submit-excerpt').value);
  formData.append('body', document.querySelector('#submit-body').value);
  formData.append('submitted_by', document.querySelector('#submit-name').value.trim());
  const cover = document.querySelector('#submit-cover').files[0];
  if (cover) formData.append('cover_image', cover);

  submitButton.disabled = true;
  submitButton.classList.add('opacity-60');
  try {
    await submitStory(formData);
    form.reset();
    successEl.textContent = 'Thank you — your story has been submitted for review.';
    successEl.classList.remove('hidden');
  } catch (error) {
    errorEl.textContent = error instanceof ApiError ? error.message : 'Could not submit your story just now.';
    errorEl.classList.remove('hidden');
  } finally {
    submitButton.disabled = false;
    submitButton.classList.remove('opacity-60');
  }
});
