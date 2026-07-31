/* ============================================================
   SHARED.JS — Utilities, navigation, data management
   MEDBITS Frontdesk Portal
   ============================================================ */

const FRONTDESK_API_BASE_URL = 'http://localhost:3000';

// --- Data Store (loaded once, shared globally) ---
const AppState = {
  currentUser: null
};

const STORAGE_KEYS = {
  queue: 'medbits_frontdesk_queue',
  registrations: 'medbits_frontdesk_registrations',
  bookedFollowUps: 'medbits_frontdesk_booked_followups'
};

// --- Session management (localStorage) ---
function getSession() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

function setSession(data) {
  localStorage.setItem('user', JSON.stringify(data));
}

async function loadCurrentFrontdeskProfile() {
  const session = getSession();
  if (!session?.id || session.role !== 'frontdesk') return null;

  const response = await fetch(
    `${FRONTDESK_API_BASE_URL}/frontdesk/${encodeURIComponent(session.id)}`,
    { headers: { role: 'frontdesk' } },
  );

  if (!response.ok) {
    throw new Error('Failed to load frontdesk profile');
  }

  const profile = await response.json();
  const updatedSession = { ...session, name: profile.name, email: profile.email };
  setSession(updatedSession);
  AppState.currentUser = profile;
  return profile;
}

function clearSession() {
  localStorage.removeItem('user');
  localStorage.removeItem('medbits_selected_patient');
  localStorage.removeItem('medbits_selected_specialty');
  localStorage.removeItem('medbits_selected_doctor');
}

function getSelectedPatient() {
  const raw = localStorage.getItem('medbits_selected_patient');
  return raw ? JSON.parse(raw) : null;
}

function setSelectedPatient(patient) {
  localStorage.setItem('medbits_selected_patient', JSON.stringify(patient));
}

function getSelectedSpecialty() {
  const raw = localStorage.getItem('medbits_selected_specialty');
  return raw ? JSON.parse(raw) : null;
}

function setSelectedSpecialty(s) {
  localStorage.setItem('medbits_selected_specialty', JSON.stringify(s));
}

function getSelectedDoctor() {
  const raw = localStorage.getItem('medbits_selected_doctor');
  return raw ? JSON.parse(raw) : null;
}

function setSelectedDoctor(d) {
  localStorage.setItem('medbits_selected_doctor', JSON.stringify(d));
}

function getStoredQueue() {
  const raw = localStorage.getItem(STORAGE_KEYS.queue);
  return raw ? JSON.parse(raw) : null;
}

function saveQueue(queueItems) {
  localStorage.setItem(STORAGE_KEYS.queue, JSON.stringify(queueItems));
}

function getStoredRegistrations() {
  // Legacy cleanup: registrations used to live in localStorage.
  if (localStorage.getItem(STORAGE_KEYS.registrations)) {
    localStorage.removeItem(STORAGE_KEYS.registrations);
  }
  const raw = sessionStorage.getItem(STORAGE_KEYS.registrations);
  return raw ? JSON.parse(raw) : [];
}

function saveRecentRegistration(patient) {
  const registrations = getStoredRegistrations().filter(item => item.patientId !== patient.patientId);
  registrations.unshift(patient);
  sessionStorage.setItem(STORAGE_KEYS.registrations, JSON.stringify(registrations.slice(0, 20)));
}

function getRecentRegistrations(defaultPatients = []) {
  const storedRegistrations = getStoredRegistrations();
  const fallbackPatients = [...defaultPatients].reverse();
  const seen = new Set();

  return [...storedRegistrations, ...fallbackPatients].filter(patient => {
    const key = patient.patientId || patient.id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getQueueItems() {
  const storedQueue = getStoredQueue();
  if (Array.isArray(storedQueue) && storedQueue.length > 0) return storedQueue;

  return Array.isArray(storedQueue) ? storedQueue : [];
}

function getBookedFollowUpIds() {
  const raw = sessionStorage.getItem(STORAGE_KEYS.bookedFollowUps);
  const parsed = raw ? JSON.parse(raw) : [];
  return Array.isArray(parsed) ? parsed : [];
}

function saveBookedFollowUpIds(ids) {
  sessionStorage.setItem(STORAGE_KEYS.bookedFollowUps, JSON.stringify(ids));
}

function addBookedFollowUpId(id) {
  const ids = getBookedFollowUpIds();
  if (ids.includes(id)) return;
  ids.push(id);
  saveBookedFollowUpIds(ids);
}

function clearBookedFollowUpIds() {
  sessionStorage.removeItem(STORAGE_KEYS.bookedFollowUps);
}

// --- Toast notifications ---
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success'
    ? `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`
    : `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// --- Navigation helper ---
function navigateTo(page) {
  window.location.href = `${page}.html`;
}

// --- Render sidebar + topbar into page ---
function renderShell(activePage) {
  const session = getSession();
  if (!session || session.role !== 'frontdesk') {
    window.location.href = '../login.html';
    return;
  }
  const userName = session?.name || 'Frontdesk User';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', href: 'dashboard.html', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>` },
    { id: 'walkin', label: 'Walk-in Registrations', href: 'walkin.html', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/><line x1="20" y1="8" x2="20" y2="14"/></svg>` },
    { id: 'appointments', label: 'Appointment Management', href: 'appointments.html', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/></svg>` },
    { id: 'followup', label: 'Follow-Up & Referral Coordination', href: 'followup.html', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>` },
    { id: 'queue', label: 'Queue Management', href: 'queue.html', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><circle cx="23" cy="15" r="4"/></svg>` },
    { id: 'profile', label: 'Profile', href: 'profile.html', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>` },
    { id: 'logout', label: 'Logout', href: '#', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>` }
  ];

  const navHTML = navItems.map(item => `
    <a href="${item.href}" class="nav-item ${item.id === activePage ? 'active' : ''}" 
       ${item.id === 'logout' ? 'id="logout-btn"' : ''}>
      ${item.icon}
      <span class="nav-item-label">${item.label}</span>
    </a>
  `).join('');

  const pageTitles = {
    dashboard: ['Dashboard', 'Frontdesk Portal'],
    walkin: ['Walk-in Registration', 'Frontdesk Portal'],
    appointments: ['Appointment Management', 'Frontdesk Portal'],
    followup: ['Follow-Up & Referral Coordination', 'Frontdesk Portal'],
    queue: ['Queue Management', 'Frontdesk Portal'],
    profile: ['Profile', 'Frontdesk Portal']
  };

  const [title, subtitle] = pageTitles[activePage] || ['Page', 'Frontdesk Portal'];

  document.getElementById('sidebar-nav').innerHTML = navHTML;
  document.getElementById('topbar-title-h1').textContent = title;
  document.getElementById('topbar-subtitle').textContent = subtitle;
  document.getElementById('topbar-username').textContent = userName;
  loadCurrentFrontdeskProfile()
    .then((profile) => {
      if (profile?.name) {
        document.getElementById('topbar-username').textContent = profile.name;
      }
    })
    .catch((error) => {
      console.error('Frontdesk shell profile load error:', error);
    });
  setupNotifications();

  // Logout handler
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      clearSession();
      window.location.href = '../login.html';
    });
  }
}

function setupNotifications() {
  const bell = document.querySelector('.topbar-bell');
  if (!bell) return;

  let panel = document.getElementById('notification-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'notification-panel';
    panel.className = 'notification-panel hidden';
    panel.innerHTML = `
      <div class="notification-panel-header">
        <div class="notification-panel-title">Notifications</div>
        <div class="notification-panel-subtitle">Front desk updates</div>
      </div>
      <div class="notification-list" id="notification-list"></div>
    `;
    document.body.appendChild(panel);
  }

  renderNotifications();

  bell.addEventListener('click', (event) => {
    event.stopPropagation();
    panel.classList.toggle('hidden');
  });

  panel.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  document.addEventListener('click', () => {
    panel.classList.add('hidden');
  });
}

function renderNotifications() {
  const container = document.getElementById('notification-list');
  if (!container) return;

  fetch('http://localhost:3000/queue', {
    headers: { role: 'frontdesk' },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to load queue notifications');
      }

      return response.json();
    })
    .then((queueItems) => {
      const waitingCount = queueItems.filter(item => item.status === 'waiting').length;
      const consultingCount = queueItems.filter(item => item.status === 'in-consultation').length;

      const notifications = [
        { title: `${waitingCount} patients waiting`, meta: 'Queue management', tone: 'warning' },
        { title: `${consultingCount} consultations in progress`, meta: 'Doctor desks', tone: 'info' },
        { title: 'Walk-in counter is active', meta: 'Front desk operations', tone: 'success' }
      ];

      container.innerHTML = notifications.map(item => `
        <div class="notification-item">
          <span class="notification-dot notification-dot--${item.tone}"></span>
          <div class="notification-copy">
            <div class="notification-title">${item.title}</div>
            <div class="notification-meta">${item.meta}</div>
          </div>
        </div>
      `).join('');
    })
    .catch(() => {
      container.innerHTML = `
        <div class="notification-item">
          <span class="notification-dot notification-dot--info"></span>
          <div class="notification-copy">
            <div class="notification-title">Queue updates unavailable</div>
            <div class="notification-meta">Backend connection needed</div>
          </div>
        </div>
      `;
    });
}

// --- Validate form fields ---
function validateField(input, errorEl, rules) {
  const val = input.value.trim();
  let errorMsg = '';

  if (rules.required && !val) {
    errorMsg = 'This field is required.';
  } else if (rules.phone && val && !/^\d{10}$/.test(val)) {
    errorMsg = 'Enter a valid 10-digit phone number.';
  } else if (rules.email && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
    errorMsg = 'Enter a valid email address.';
  } else if (rules.dob && val && !/^\d{2}-\d{2}-\d{4}$/.test(val)) {
    errorMsg = 'Enter date as DD-MM-YYYY.';
  }

  if (errorMsg) {
    input.classList.add('error');
    if (errorEl) {
      errorEl.textContent = errorMsg;
      errorEl.classList.add('visible');
    }
    return false;
  } else {
    input.classList.remove('error');
    if (errorEl) errorEl.classList.remove('visible');
    return true;
  }
}

// --- Format currency ---
function formatCurrency(amount) {
  return '₹' + amount.toLocaleString('en-IN');
}

// --- Get specialty icon SVG ---
function getSpecialtyIcon(iconType) {
  const icons = {
    general: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><circle cx="32" cy="20" r="10"/><path d="M12 54c0-11 9-20 20-20s20 9 20 20"/><line x1="32" y1="35" x2="32" y2="45"/><line x1="27" y1="40" x2="37" y2="40"/></svg>`,
    dermatology: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><circle cx="32" cy="32" r="22"/><circle cx="32" cy="22" r="5"/><circle cx="22" cy="38" r="5"/><circle cx="42" cy="38" r="5"/></svg>`,
    neurology: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M32 12c-8 0-14 6-14 14 0 5 3 10 7 13v13h14V39c4-3 7-8 7-13 0-8-6-14-14-14z"/><line x1="32" y1="26" x2="32" y2="39"/></svg>`,
    ortho: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M24 52V32l-8-10V12m16 40V32l8-10V12"/><line x1="20" y1="22" x2="44" y2="22"/></svg>`,
    diabetology: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="18" y="18" width="28" height="28" rx="6"/><line x1="32" y1="24" x2="32" y2="40"/><line x1="24" y1="32" x2="40" y2="32"/></svg>`,
    dentist: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 16c0-4 4-6 8-6 2 0 4 1 4 1s2-1 4-1c4 0 8 2 8 6 0 8-4 20-8 28-1 3-2 4-4 4s-3-1-4-4C24 36 20 24 20 16z"/></svg>`,
    cardiology: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M32 52S10 38 10 24c0-7 5-12 11-12 4 0 8 2 11 6 3-4 7-6 11-6 6 0 11 5 11 12 0 14-22 28-22 28z"/></svg>`,
    paediatrics: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><circle cx="32" cy="20" r="8"/><path d="M14 52c0-10 8-18 18-18s18 8 18 18"/><path d="M26 20c0 0 2 4 6 4s6-4 6-4"/></svg>`,
    nephrology: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M24 12c-8 4-12 16-8 26 2 6 8 14 16 14s14-8 16-14c4-10 0-22-8-26-2-1-5-2-8 0-3-2-6-1-8 0z"/></svg>`,
    ent: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M32 14c-8 0-14 6-14 14 0 6 3 11 8 13v9h12v-9c5-2 8-7 8-13 0-8-6-14-14-14z"/><line x1="26" y1="50" x2="38" y2="50"/></svg>`,
    endocrinology: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><circle cx="32" cy="24" r="10"/><path d="M20 40c0 0-4 4-4 8h32c0-4-4-8-4-8"/><line x1="32" y1="34" x2="32" y2="40"/></svg>`,
    rheumatology: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M32 14v36M18 28l14-14 14 14"/><circle cx="32" cy="42" r="6"/></svg>`,
    ophthalmology: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 32s8-16 22-16 22 16 22 16-8 16-22 16S10 32 10 32z"/><circle cx="32" cy="32" r="6"/></svg>`,
    infectious: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><circle cx="32" cy="32" r="14"/><line x1="32" y1="10" x2="32" y2="18"/><line x1="32" y1="46" x2="32" y2="54"/><line x1="10" y1="32" x2="18" y2="32"/><line x1="46" y1="32" x2="54" y2="32"/></svg>`,
    oncology: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><circle cx="32" cy="32" r="18"/><line x1="32" y1="14" x2="32" y2="50"/><line x1="14" y1="32" x2="50" y2="32"/><circle cx="32" cy="32" r="6"/></svg>`,
    psychology: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M32 12c-10 0-18 8-18 18 0 6 3 12 8 16v6h20v-6c5-4 8-10 8-16 0-10-8-18-18-18z"/><path d="M26 32c0-3 3-6 6-6s6 3 6 6"/></svg>`,
    neurosurgery: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M32 12c-10 0-18 8-18 18 0 7 3 13 8 17v5h20v-5c5-4 8-10 8-17 0-10-8-18-18-18z"/><line x1="24" y1="28" x2="40" y2="28"/><line x1="28" y1="22" x2="36" y2="34"/></svg>`,
    psychiatry: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><circle cx="32" cy="28" r="14"/><path d="M20 42c0 6 5 10 12 10s12-4 12-10"/><line x1="28" y1="24" x2="28" y2="32"/><line x1="36" y1="24" x2="36" y2="32"/></svg>`,
    urology: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12c-4 4-4 14 0 22 2 4 6 8 10 8s8-4 10-8c4-8 4-18 0-22"/><path d="M28 42v10M36 42v10"/></svg>`,
    pulmonology: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M32 16v8M20 24c-6 2-10 8-10 16 0 6 4 12 10 12 4 0 8-2 10-6"/><path d="M44 24c6 2 10 8 10 16 0 6-4 12-10 12-4 0-8-2-10-6"/></svg>`
  };
  return icons[iconType] || icons.general;
}
