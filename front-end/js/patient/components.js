/* ============================================
   components.js — Loads sidebar + navbar
   FILE: front-end/js/patient/components.js

   Load order on every patient page:
     1. data.js    — DB object
     2. utils.js   — getSession, clearSession, helpers  ← loaded first
     3. components.js (this file)
     4. page-specific .js (dashboard.js, appointments.js, etc.)

   Because utils.js is loaded before this file, clearSession()
   is always available here. No more session-not-cleared bug.
   ============================================ */

// SESSION_KEY must match the one in auth.js and utils.js
const _SESSION_KEY = 'user';

async function loadComponents(activePage, pageTitle) {
  if (!requireRole('patient')) return;

  // Fetch sidebar and navbar HTML fragments.
  // Patient pages are at:  html/patient/*.html
  // Components are at:     html/components/p_sidebar.html
  // Relative path:         ../components/p_sidebar.html
  const [sidebarHTML, navbarHTML] = await Promise.all([
    fetch('../components/p_sidebar.html').then(r => {
      if (!r.ok) throw new Error('Could not load sidebar: ' + r.url);
      return r.text();
    }),
    fetch('../components/p_navbar.html').then(r => {
      if (!r.ok) throw new Error('Could not load navbar: ' + r.url);
      return r.text();
    })
  ]);

  // Inject them into the mount point divs in the HTML page
  document.getElementById('sidebarMount').innerHTML = sidebarHTML;
  document.getElementById('navbarMount').innerHTML  = navbarHTML;

  // Highlight the active page in the sidebar
  const activeLink = document.querySelector('.nav-item[data-page="' + activePage + '"]');
  if (activeLink) activeLink.classList.add('active');

  // Set the page title in the topbar
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = pageTitle;

  // Wire the hamburger button (mobile sidebar toggle)
  const menuBtn = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
  }

  // Close sidebar when tapping outside it on mobile
  document.addEventListener('click', function(e) {
    if (!sidebar) return;
    if (sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        e.target !== menuBtn) {
      sidebar.classList.remove('open');
    }
  });

  // ── LOGOUT ──────────────────────────────────────────────────────
  // clearSession() is defined in utils.js which is loaded before
  // this file, so it is always available here.
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      // Clear the session — clearSession() from utils.js
      if (typeof clearSession === 'function') {
        clearSession();
      } else {
        // Fallback: remove directly (should not be needed)
        localStorage.removeItem(_SESSION_KEY);
      }

      // Use location.replace so the dashboard is removed from browser
      // history — pressing Back after logout won't return to the dashboard
      window.location.replace('../login.html');
    });
  }

  // Notification bell
  const notifBtn = document.getElementById('notifBtn');
  if (notifBtn) {
    notifBtn.addEventListener('click', () => {
      if (typeof showToast === 'function') {
        showToast('No new notifications', 'info');
      }
    });
  }
}
