import '../styles/main.css';
import { requireSession } from './api.js';
import { mountChrome } from './layout.js';

mountChrome('home');

// The page content is static, so this is purely the session guard: an expired
// or missing viewer cookie redirects to the gateway from inside api.js.
requireSession().catch(() => {
  /* Network hiccups shouldn't blank a page that needs no data to render. */
});
