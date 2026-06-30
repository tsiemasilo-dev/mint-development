/**
 * Admin Preview Mode
 *
 * When the Mint CRM opens a client session via impersonation, it appends
 * ?admin_preview=1 to the magic link redirect URL.
 *
 * initAdminPreview() — call once on app load. Detects the flag in the URL
 *   and saves it to localStorage so it survives client-side navigation.
 *
 * isAdminPreview() — call in any component to check if this is a read-only
 *   admin session. Returns true when the admin preview flag is active.
 *
 * clearAdminPreview() — call on sign-out to clean up the flag so a real
 *   client logging in on the same browser gets a normal session.
 */

export function initAdminPreview() {
  if (typeof window === 'undefined') return;
  if (new URLSearchParams(window.location.search).has('admin_preview')) {
    localStorage.setItem('mint_admin_preview', '1');
  }
}

export function isAdminPreview() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('mint_admin_preview') === '1';
}

export function clearAdminPreview() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('mint_admin_preview');
  }
}
