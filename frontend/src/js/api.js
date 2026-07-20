/**
 * Thin API client for the JMT Legacy backend.
 *
 * Auth is an HTTP-only cookie the browser sets on /auth/validate-code/ — JS
 * can never read it, so there is no token to attach and no reliable way to
 * ask "am I signed in?" other than making a call and seeing whether it 401s.
 * Every 401 therefore bounces the visitor back to the gateway.
 */

const API_ROOT = '/api/v1';

/** Where an unauthenticated visitor gets sent back to. */
export const GATEWAY_URL = '/index.html';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function redirectToGateway() {
  // Remember where they were headed so the gateway can return them there.
  const here = window.location.pathname + window.location.search;
  if (!here.includes('index.html')) {
    sessionStorage.setItem('jmt:returnTo', here);
  }
  window.location.replace(GATEWAY_URL);
}

async function request(path, { method = 'GET', body, redirectOn401 = true } = {}) {
  let response;
  try {
    response = await fetch(`${API_ROOT}${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Could not reach the archive. Is the server running?', 0);
  }

  if (response.status === 401 || response.status === 403) {
    if (redirectOn401) {
      redirectToGateway();
      // Never resolves — the page is navigating away.
      return new Promise(() => {});
    }
    const detail = await readDetail(response);
    throw new ApiError(detail || 'Access denied.', response.status);
  }

  if (!response.ok) {
    const detail = await readDetail(response);
    throw new ApiError(detail || `Request failed (${response.status}).`, response.status);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function readDetail(response) {
  try {
    const data = await response.json();
    return data.detail || data.code?.[0] || null;
  } catch {
    return null;
  }
}

/** Unwraps DRF's PageNumberPagination envelope; tolerates a bare array too. */
function results(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.results ?? [];
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** Exchanges a plaintext family access code for the viewer cookie. */
export function validateCode(code) {
  return request('/auth/validate-code/', {
    method: 'POST',
    body: { code },
    redirectOn401: false, // the gateway shows the error inline instead
  });
}

/**
 * Confirms the viewer cookie is still valid, bouncing to the gateway if not.
 *
 * There is no dedicated session endpoint on the backend, so this pings the
 * cheapest viewer-gated resource and relies on the shared 401 handling.
 * Pages with no other data call of their own use this as their guard.
 */
export async function requireSession() {
  await request('/anniversary/events/');
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

export async function getFamilyTree() {
  return request('/family-tree/');
}

export function getFamilyMember(id) {
  return request(`/family-tree/members/${id}/`);
}

export async function getPhotos({ era } = {}) {
  const query = era ? `?era=${encodeURIComponent(era)}` : '';
  return results(await request(`/gallery/photos/${query}`));
}

export function getPhoto(id) {
  return request(`/gallery/photos/${id}/`);
}

export async function getStories({ category } = {}) {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return results(await request(`/stories/${query}`));
}

export function getStory(id) {
  return request(`/stories/${id}/`);
}

export async function getAnniversaryEvents() {
  return results(await request('/anniversary/events/'));
}
