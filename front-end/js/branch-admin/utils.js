/* ============================================================
   utils.js — Shared helpers for ALL Branch Admin pages
   FILE: front-end/js/branch-admin/utils.js

   Load order on every branch-admin page:
     1. utils.js    (this file) — session, toast, modal, API
     2. components.js           — sidebar + navbar inject
     3. page-specific .js
   ============================================================ */

const SESSION_KEY = 'user';

// ── SESSION ────────────────────────────────────────────────
function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_e) {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function requireRole(...allowed) {
  const user = getSession();
  if (!user || !allowed.includes(user.role)) {
    window.location.replace('../login.html');
    return null;
  }
  return user;
}

// ── API ────────────────────────────────────────────────────
const API_BASE = 'http://localhost:3000';

function getAuthHeaders(extra = {}) {
  const session = getSession();
  const headers = { 'Content-Type': 'application/json', ...extra };
  // Send actual role — roles.guard.ts maps 'branch_admin' → 'admin' automatically.
  // The middleware also reads x-user-id to scope branchId automatically.
  if (session?.role) headers['role'] = session.role;
  if (session?.id)   headers['x-user-id'] = session.id;
  return headers;
}

async function getErrorMessage(response) {
  try {
    const body = await response.json();
    if (Array.isArray(body?.message)) return body.message.join(', ');
    return body?.message || `HTTP ${response.status}`;
  } catch (_e) {
    return `HTTP ${response.status}`;
  }
}

async function apiRequest(path, options = {}) {
  const { headers: extraHeaders, ...rest } = options;
  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: { ...getAuthHeaders(), ...(extraHeaders || {}) },
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }
  // 204 No Content
  if (response.status === 204) return null;
  return response.json();
}

// ── DATE HELPERS ───────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function today() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(d) {
  if (!d || !String(d).includes('-')) return d || '—';
  const [y, m, day] = String(d).split('-');
  return `${MONTHS[+m - 1]} ${+day}, ${y}`;
}

// ── DOM HELPERS ────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

function val(id) {
  const el = $(id);
  return el ? el.value.trim() : '';
}

function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── TOAST ──────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = $('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// ── MODAL ──────────────────────────────────────────────────
function openModal(html) {
  const content = $('modalContent');
  const overlay = $('modalOverlay');
  if (content) content.innerHTML = html;
  if (overlay) overlay.classList.add('open');
}

function closeModal() {
  const overlay = $('modalOverlay');
  if (overlay) overlay.classList.remove('open');
  currentEditId = null;
}

function confirmAction(title, message, confirmText, onConfirm) {
  window.__confirmCallback = function() {
    closeModal();
    if (typeof onConfirm === 'function') onConfirm();
  };
  
  const html = `
    <div class="modal-title" style="color: var(--red); display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 24px;">⚠️</span> ${escapeHtml(title)}
    </div>
    <div style="margin-bottom: 24px; font-size: 15px; color: var(--text); line-height: 1.5;">
      ${escapeHtml(message)}
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button type="button" class="btn btn-red" onclick="window.__confirmCallback()">${escapeHtml(confirmText)}</button>
    </div>
  `;
  openModal(html);
}

// ── TOPBAR USER ────────────────────────────────────────────
function updateTopbarUser() {
  const session = getSession();
  let firstName = '', lastName = '';

  if (session?.firstName) {
    firstName = session.firstName;
    lastName  = session.lastName || '';
  } else if (session?.name) {
    const parts = session.name.trim().split(/\s+/);
    firstName = parts[0] || '';
    lastName  = parts.slice(1).join(' ');
  }

  const initials = (firstName ? firstName[0] : '?').toUpperCase()
                 + (lastName  ? lastName[0]  : '').toUpperCase();
  const fullName = firstName + (lastName ? ' ' + lastName : '');

  const avatar = $('userAvatarTop');
  const name   = $('userNameTop');
  if (avatar) avatar.textContent = initials;
  if (name)   name.textContent   = fullName || 'Branch Admin';
}

// ── SHARED STATE ───────────────────────────────────────────
let currentEditId = null;
