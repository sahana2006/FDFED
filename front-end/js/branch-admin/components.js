/* ============================================================
   components.js — Wires sidebar + navbar for Branch Admin pages
   FILE: front-end/js/branch-admin/components.js

   Sidebar and navbar HTML are now inlined directly in each page,
   so this file only handles interactivity wiring (no fetch needed).

   Load order on every branch-admin page:
     1. utils.js    — session, API, helpers
     2. components.js (this file)
     3. page-specific .js
   ============================================================ */

async function loadComponents(activePage, pageTitle) {
  // ── Auth guard ─────────────────────────────────────────────
  // Only redirect if there IS a session but with the wrong role.
  // If there's no session at all (e.g. opening via file://) we
  // let the layout render so the UI is still visible.
  const user = getSession();
  if (user && user.role !== 'branch_admin' && user.role !== 'admin') {
    window.location.replace('../login.html');
    return;
  }

  // ── Active nav highlight ────────────────────────────────────
  // Clear any hardcoded 'active' classes, then set the correct one.
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const activeLink = document.querySelector(`.nav-item[data-page="${activePage}"]`);
  if (activeLink) activeLink.classList.add('active');

  // ── Topbar title ────────────────────────────────────────────
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = pageTitle;

  const subtitleEl = document.getElementById('portalLabel');
  if (subtitleEl) subtitleEl.textContent = 'Branch Admin Portal';

  // ── Hamburger toggle (mobile) ───────────────────────────────
  const menuBtn = document.getElementById('menuToggle');
  const sidebar  = document.getElementById('sidebar');
  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
  }

  // ── Close sidebar on outside click ─────────────────────────
  document.addEventListener('click', function (e) {
    if (!sidebar) return;
    if (sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        e.target !== menuBtn) {
      sidebar.classList.remove('open');
    }
  });

  // ── Logout ──────────────────────────────────────────────────
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      if (typeof clearSession === 'function') clearSession();
      else localStorage.removeItem('user');
      window.location.replace('../login.html');
    });
  }

  // ── Notification bell ───────────────────────────────────────
  const notifBtn = document.getElementById('notifBtn');
  if (notifBtn) {
    notifBtn.addEventListener('click', () => {
      if (typeof showToast === 'function') showToast('No new notifications', 'info');
    });
  }
}
