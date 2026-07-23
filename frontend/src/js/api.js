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

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

/** Where an unauthenticated admin visitor gets sent back to. */
export const ADMIN_GATEWAY_URL = '/admin-login.html';

function redirectToAdminGateway() {
  window.location.replace(ADMIN_GATEWAY_URL);
}

async function adminRequest(path, options = {}) {
  try {
    return await request(path, { ...options, redirectOn401: false });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      redirectToAdminGateway();
      return new Promise(() => {});
    }
    throw error;
  }
}

/** Confirms the admin cookie is still valid, bouncing to the admin login if not. */
export async function requireAdminSession() {
  await adminRequest('/stories/admin/');
}

export function adminLogin(username, password) {
  return request('/auth/admin/login/', {
    method: 'POST',
    body: { username, password },
    redirectOn401: false,
  });
}

export async function adminLogout() {
  await adminRequest('/auth/admin/logout/', { method: 'POST' });
}

/** Generates (rotates) a new Family Viewer access code. Plaintext is returned once. */
export function generateAccessCode({ label = '', expiresInDays = 365 } = {}) {
  return adminRequest('/auth/admin/access-codes/', {
    method: 'POST',
    body: { label, expires_in_days: expiresInDays },
  });
}

export function deactivateAccessCode(id) {
  return adminRequest(`/auth/admin/access-codes/${id}/deactivate/`, { method: 'POST' });
}

/** Uploads one or more photo files (multipart), optionally tagged with an era. */
export async function bulkUploadPhotos(files, era) {
  const formData = new FormData();
  [...files].forEach((file) => formData.append('images', file));
  if (era) formData.append('era', era);

  const response = await fetch(`${API_ROOT}/gallery/photos/bulk-upload/`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (response.status === 401 || response.status === 403) {
    redirectToAdminGateway();
    return new Promise(() => {});
  }
  if (!response.ok) {
    const detail = await readDetail(response);
    throw new ApiError(detail || `Upload failed (${response.status}).`, response.status);
  }
  return response.json();
}

export function updatePhotoStatus(id, status) {
  return adminRequest(`/gallery/photos/${id}/status/`, { method: 'PATCH', body: { status } });
}

export async function listAdminStories() {
  return results(await adminRequest('/stories/admin/'));
}

export function createStory(story) {
  return adminRequest('/stories/admin/', { method: 'POST', body: story });
}

export function getAdminStory(id) {
  return adminRequest(`/stories/admin/${id}/`);
}

export function updateStory(id, patch) {
  return adminRequest(`/stories/admin/${id}/`, { method: 'PATCH', body: patch });
}
