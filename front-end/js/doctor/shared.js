/* ============================================================
   components.js — loads sidebar + header, wires all shared
   interactions (sidebar toggle, dropdowns, notifications)
   ============================================================ */

/* ── Shared doctor profile data (persisted in localStorage) ── */
function getDoctorProfile() {
  const saved = localStorage.getItem('doctorProfile');
  if (saved) return JSON.parse(saved);
  return { name: 'Dr. Sarah Johnson', role: 'Consultant Physician', initials: 'SJ' };
}

function logoutDoctor() {
  localStorage.removeItem('user');
  window.location.replace('../login.html');
}

function getSidebarTemplate() {
  return `
<aside class="sidebar" id="sidebar">
  <div class="sidebar-brand">
    <span class="brand-icon">✓</span>
    <span class="brand-text">MEDBITS</span>
  </div>
  <nav class="sidebar-nav">
    <a href="dashboard.html" class="nav-item" data-page="dashboard" data-tooltip="Dashboard"><span class="nav-icon">⊞</span><span class="nav-label">Dashboard</span></a>
    <a href="profile.html" class="nav-item" data-page="profile" data-tooltip="Profile"><span class="nav-icon">◉</span><span class="nav-label">Profile</span></a>
    <a href="consultation-notes.html" class="nav-item" data-page="consultation-notes" data-tooltip="Consultation Notes"><span class="nav-icon">📋</span><span class="nav-label">Consultation Notes</span></a>
    <a href="internal-referral.html" class="nav-item" data-page="internal-referral" data-tooltip="Internal Referral"><span class="nav-icon">🔗</span><span class="nav-label">Internal Referral</span></a>
    <a href="lab-test.html" class="nav-item" data-page="lab-test" data-tooltip="Lab Test"><span class="nav-icon">🧪</span><span class="nav-label">Lab Test</span></a>
    <a href="treatment-plan.html" class="nav-item" data-page="treatment-plan" data-tooltip="Treatment Plan"><span class="nav-icon">💊</span><span class="nav-label">Treatment Plan</span></a>
    <a href="slot-management.html" class="nav-item" data-page="slot-management" data-tooltip="Slot Management"><span class="nav-icon">🕐</span><span class="nav-label">Slot Management</span></a>
  </nav>
  <div class="sidebar-bottom">
    <a href="../login.html" class="nav-item nav-logout" data-logout="true">
      <span class="nav-icon">⇥</span><span class="nav-label">Logout</span>
    </a>
  </div>
</aside>`;
}

function getHeaderTemplate() {
  return `
<header class="topbar" id="topbar">
  <div class="topbar-left">
    <button class="sidebar-toggle" id="sidebarToggle" aria-label="Toggle Sidebar">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    </button>
    <div class="topbar-page-info">
      <h1 class="page-title" id="pageTitle">Dashboard</h1>
      <span class="page-subtitle">Doctor Portal</span>
    </div>
  </div>

  <div class="topbar-right">
    <button class="topbar-btn notif-btn header-icon-btn" id="notifBtn" aria-label="Notifications">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span class="notif-badge" id="notifBadge">3</span>
    </button>

    <div class="notif-dropdown" id="notifDropdown">
      <div class="notif-header">
        <span>Notifications</span>
        <button class="notif-clear" id="notifClear">Clear all</button>
      </div>
      <div class="notif-list">
        <div class="notif-item unread">
          <div class="notif-dot"></div>
          <div class="notif-content">
            <p>New appointment confirmed - <strong>Paul Johnson</strong></p>
            <span>10:00 AM today</span>
          </div>
        </div>
        <div class="notif-item unread">
          <div class="notif-dot"></div>
          <div class="notif-content">
            <p>Lab result ready - <strong>Neil Verma</strong></p>
            <span>Yesterday, 4:30 PM</span>
          </div>
        </div>
        <div class="notif-item unread">
          <div class="notif-dot"></div>
          <div class="notif-content">
            <p>Follow-up reminder - <strong>Ria Sharma</strong></p>
            <span>Yesterday, 2:00 PM</span>
          </div>
        </div>
      </div>
    </div>

    <div class="doctor-profile" id="doctorProfile">
      <div class="doctor-avatar doctor-avatar-solid" id="userAvatarTop">SJ</div>
      <div class="doctor-info">
        <span class="doctor-name" id="userNameTop">Dr. Sarah Johnson</span>
        <span class="doctor-role" id="userRoleTop">Consultant Physician</span>
      </div>
    </div>

    <div class="profile-dropdown" id="profileDropdown">
      <a href="profile.html" class="dropdown-item">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
        My Profile
      </a>
      <div class="dropdown-divider"></div>
      <a href="../login.html" class="dropdown-item logout-item" data-logout="true">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16,17 21,12 16,7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Logout
      </a>
    </div>
  </div>
</header>`;
}

async function loadComponents(activePage, pageTitle) {
  const sidebarHTML = getSidebarTemplate();
  const headerHTML = getHeaderTemplate();

  document.getElementById('sidebarMount').innerHTML = sidebarHTML;
  document.getElementById('headerMount').innerHTML  = headerHTML;

  document.querySelectorAll('[data-logout="true"]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      logoutDoctor();
    });
  });

  // ── Inject doctor profile into header ──
  const profile = getDoctorProfile();
  const nameEl    = document.getElementById('userNameTop');
  const roleEl    = document.getElementById('userRoleTop');
  const avatarEl  = document.getElementById('userAvatarTop');
  if (nameEl)   nameEl.textContent   = profile.name;
  if (roleEl)   roleEl.textContent   = profile.role;
  if (avatarEl) avatarEl.textContent = profile.initials;

  // Active nav highlight
  const activeLink = document.querySelector(`.nav-item[data-page="${activePage}"]`);
  if (activeLink) activeLink.classList.add('active');

  // Page title
  const titleEl = document.getElementById('pageTitle');
  if (titleEl && pageTitle) titleEl.textContent = pageTitle;

  // ── Sidebar toggle ──
  const sidebar     = document.getElementById('sidebar');
  const mainWrapper = document.getElementById('mainWrapper');
  const toggleBtn   = document.getElementById('sidebarToggle');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      if (window.innerWidth <= 900) {
        sidebar.classList.toggle('open');
        let overlay = document.getElementById('sidebarOverlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'sidebarOverlay';
          overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:99;';
          overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.remove();
          });
          document.body.appendChild(overlay);
        } else {
          overlay.remove();
        }
      } else {
        sidebar.classList.toggle('collapsed');
        if (mainWrapper) mainWrapper.classList.toggle('sidebar-collapsed');
      }
    });
  }

  // Close mobile sidebar on outside click
  document.addEventListener('click', e => {
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) && e.target !== toggleBtn) {
      sidebar.classList.remove('open');
      if (overlay) overlay.remove();
    }
  });

  // ── Notification dropdown ──
  const notifBtn      = document.getElementById('notifBtn');
  const notifDropdown = document.getElementById('notifDropdown');
  const notifClear    = document.getElementById('notifClear');
  const notifBadge    = document.getElementById('notifBadge');

  if (notifBtn && notifDropdown) {
    notifBtn.addEventListener('click', e => {
      e.stopPropagation();
      notifDropdown.classList.toggle('open');
      if (profileDropdown) profileDropdown.classList.remove('open');
      if (doctorProfile)   doctorProfile.classList.remove('open');
    });
  }
  if (notifClear) {
    notifClear.addEventListener('click', () => {
      document.querySelectorAll('.notif-item.unread').forEach(i => i.classList.remove('unread'));
      document.querySelectorAll('.notif-dot').forEach(d => d.style.opacity = '0');
      if (notifBadge) notifBadge.style.display = 'none';
    });
  }

  // ── Profile dropdown ──
  const doctorProfile   = document.getElementById('doctorProfile');
  const profileDropdown = document.getElementById('profileDropdown');

  if (doctorProfile && profileDropdown) {
    doctorProfile.addEventListener('click', e => {
      e.stopPropagation();
      profileDropdown.classList.toggle('open');
      doctorProfile.classList.toggle('open');
      if (notifDropdown) notifDropdown.classList.remove('open');
    });
  }

  // Close all dropdowns on outside click
  document.addEventListener('click', () => {
    if (notifDropdown)   notifDropdown.classList.remove('open');
    if (profileDropdown) profileDropdown.classList.remove('open');
    if (doctorProfile)   doctorProfile.classList.remove('open');
  });
}

/* ── Toast utility ─────────────────────────────────────────── */
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut .3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}
