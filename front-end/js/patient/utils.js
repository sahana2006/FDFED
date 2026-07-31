/* ============================================
   utils.js — Shared helpers for ALL patient pages
   FILE: front-end/js/patient/utils.js

   IMPORTANT: auth.js is only loaded on login.html and signup.html.
   Any function needed on dashboard pages (patient/*.html) must
   be defined HERE, not in auth.js.

   That includes getSession() — it reads localStorage and is
   needed by dashboard.js to show the real logged-in user's name.
   ============================================ */

// ── SESSION KEY (must match auth.js exactly) ──────────────────────
const SESSION_KEY = 'user';

// Read the current session from localStorage.
// Returns the session object, or null if not logged in.
function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// Remove the session (used by logout in components.js)
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function requireRole(expectedRole) {
  const user = getSession();
  if (!user || user.role !== expectedRole) {
    window.location.href = '../login.html';
    return null;
  }
  return user;
}

// ── DATE HELPERS ──────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function today() {
  return new Date().toISOString().split('T')[0];
}

// "2026-03-15" → "Mar 15, 2026"
function formatDate(d) {
  if (!d || !d.includes('-')) return d || '';
  const [y, m, day] = d.split('-');
  return MONTHS[+m - 1] + ' ' + +day + ', ' + y;
}

// ── DOM HELPERS ───────────────────────────────────────────────────
// Get value of a form field by id
function val(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

// Set text content of an element by id
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ── TOAST ─────────────────────────────────────────────────────────
function showToast(message, type) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className   = 'toast ' + (type || '');
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ── MODAL ─────────────────────────────────────────────────────────
function openModal(html) {
  document.getElementById('modalContent').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  currentEditId = null;
}

// ── TOPBAR USER ───────────────────────────────────────────────────
// Shows the logged-in user's name and initials in the topbar.
// Reads only from the authenticated session.
function updateTopbarUser() {
  const session = getSession();  // now always works — defined above

  let firstName = '';
  let lastName  = '';

  if (session && session.firstName) {
    // Use the real logged-in user's name from the session
    firstName = session.firstName;
    lastName  = session.lastName || '';
  } else if (session && session.name) {
    const [derivedFirstName, ...rest] = session.name.trim().split(/\s+/);
    firstName = derivedFirstName || '';
    lastName = rest.join(' ');
  }

  const initial1 = firstName ? firstName[0].toUpperCase() : '?';
  const initial2 = lastName  ? lastName[0].toUpperCase()  : '';
  const fullName = firstName + (lastName ? ' ' + lastName : '');

  const avatar = document.getElementById('userAvatarTop');
  const name   = document.getElementById('userNameTop');
  if (avatar) avatar.textContent = initial1 + initial2;
  if (name)   name.textContent   = fullName;
}

// ── SHARED STATE ──────────────────────────────────────────────────
let currentEditId = null;
