/* ============================================================
   components.js — MEDBITS Lab Technician Portal Shell
   ============================================================ */

function getAuthenticatedLabTech() {
  try {
    const raw = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;
    if (!user || user.role !== 'labtech') {
      window.location.href = '../login.html';
      return null;
    }
    return user;
  } catch (_) {
    window.location.href = '../login.html';
    return null;
  }
}

function getLabTechProfile() {
  const user = getAuthenticatedLabTech();
  if (!user) return { name: 'Lab Technician', role: 'Lab Technician', initials: 'LT' };
  const name = user.name || 'Lab Technician';
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'LT';
  return {
    id: user.id,
    name,
    email: user.email || '',
    branchId: user.branchId || '',
    role: 'Lab Technician',
    initials,
  };
}

function logoutLabTech() {
  localStorage.removeItem('user');
  window.location.replace('../login.html');
}

function getSidebarTemplate() {
  return `
<aside class="sidebar" id="sidebar">
  <div class="sidebar-brand">
    <span class="brand-icon">+</span>
    <span class="brand-text">MEDBITS</span>
  </div>
  <nav class="sidebar-nav">
    <a href="dashboard.html" class="nav-item" data-page="dashboard" data-tooltip="Dashboard">
      <span class="nav-icon">⊞</span><span class="nav-label">Dashboard</span>
    </a>
    <a href="test-requests.html" class="nav-item" data-page="test-requests" data-tooltip="Test Requests">
      <span class="nav-icon">📋</span><span class="nav-label">Test Requests</span>
    </a>
    <a href="lab-reports.html" class="nav-item" data-page="lab-reports" data-tooltip="Lab Reports">
      <span class="nav-icon">📊</span><span class="nav-label">Lab Reports</span>
    </a>
    <a href="leave.html" class="nav-item" data-page="leave" data-tooltip="Leave Management">
      <span class="nav-icon">📅</span><span class="nav-label">Leave</span>
    </a>
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
      <span class="page-subtitle">Lab Technician Portal</span>
    </div>
  </div>

  <div class="topbar-right">
    <div class="user-profile" id="userProfile">
      <div class="user-avatar" id="userAvatarTop">LT</div>
      <div class="user-info">
        <span class="user-name" id="userNameTop">Lab Technician</span>
        <span class="user-role" id="userRoleTop">Lab Technician</span>
      </div>
    </div>

    <div class="profile-dropdown" id="profileDropdown">
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
  if (!getAuthenticatedLabTech()) return;

  const sidebarMount = document.getElementById('sidebarMount');
  const headerMount = document.getElementById('headerMount');

  if (sidebarMount) sidebarMount.innerHTML = getSidebarTemplate();
  if (headerMount) headerMount.innerHTML = getHeaderTemplate();

  document.querySelectorAll('[data-logout="true"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      logoutLabTech();
    });
  });

  // Inject user profile into header
  const profile = getLabTechProfile();
  const nameEl = document.getElementById('userNameTop');
  const roleEl = document.getElementById('userRoleTop');
  const avatarEl = document.getElementById('userAvatarTop');

  if (nameEl) nameEl.textContent = profile.name;
  if (roleEl) roleEl.textContent = profile.role;
  if (avatarEl) avatarEl.textContent = profile.initials;

  // Active nav highlight
  const activeLink = document.querySelector(`.nav-item[data-page="${activePage}"]`);
  if (activeLink) activeLink.classList.add('active');

  // Page title
  const titleEl = document.getElementById('pageTitle');
  if (titleEl && pageTitle) titleEl.textContent = pageTitle;

  // Sidebar toggle
  const sidebar = document.getElementById('sidebar');
  const mainWrapper = document.getElementById('mainWrapper');
  const toggleBtn = document.getElementById('sidebarToggle');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      if (window.innerWidth <= 900) {
        sidebar.classList.toggle('open');
        let overlay = document.getElementById('sidebarOverlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'sidebarOverlay';
          overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:99;';
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
  document.addEventListener('click', (e) => {
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) && e.target !== toggleBtn) {
      sidebar.classList.remove('open');
      if (overlay) overlay.remove();
    }
  });

  // Profile dropdown
  const userProfile = document.getElementById('userProfile');
  const profileDropdown = document.getElementById('profileDropdown');

  if (userProfile && profileDropdown) {
    userProfile.addEventListener('click', (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle('open');
      userProfile.classList.toggle('open');
    });
  }

  document.addEventListener('click', () => {
    if (profileDropdown) profileDropdown.classList.remove('open');
    if (userProfile) userProfile.classList.remove('open');
  });
}

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
