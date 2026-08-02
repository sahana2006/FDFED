const API_BASE_URL = 'http://localhost:3000';
const STORAGE_KEY = 'user';

const $ = (id) => document.getElementById(id);

function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
}

function getAuthHeaders(extra = {}) {
  const session = getSession();
  const headers = {
    ...extra,
  };

  if (session?.role) {
    headers.role = session.role;
  }

  if (session?.id) {
    headers['x-user-id'] = session.id;
  }

  return headers;
}

async function getErrorMessage(response) {
  const body = await response.json().catch(() => null);
  if (Array.isArray(body?.message)) {
    return body.message.join(', ');
  }
  return body?.message || 'Request failed.';
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response.json();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(message, type = 'success') {
  const host = $('toast-host');
  if (!host) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  host.appendChild(toast);

  window.setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(6px)';
    toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
  }, 2600);

  window.setTimeout(() => toast.remove(), 3000);
}

function logoutBranchAdmin(event) {
  event?.preventDefault();
  localStorage.removeItem(STORAGE_KEY);
  window.location.href = '../login.html';
}

function renderHeader() {
  const session = getSession();
  const title = $('welcome-title');
  const copy = $('welcome-copy');

  if (title) {
    title.textContent = `${session?.name || 'Branch Admin'}`;
  }

  if (copy) {
    copy.textContent = session?.branchId
      ? 'Your branch profile and login details are loaded live from the backend.'
      : 'No branch is currently linked to this account.';
  }
}

function renderBranchDetails(branch) {
  const host = $('branch-grid');
  if (!host) return;

  if (!branch) {
    host.innerHTML = '<div class="empty-state">No branch details available.</div>';
    return;
  }

  const rows = [
    ['Hospital Name', branch.hospitalName || '-'],
    ['Branch Name', branch.branchName || '-'],
    ['Address', branch.address || '-'],
    ['City', branch.city || '-'],
    ['State', branch.state || '-'],
    ['Pincode', branch.pincode || '-'],
    ['Phone', branch.phone || '-'],
    ['Email', branch.email || '-'],
    ['Status', branch.status || '-'],
  ];

  host.innerHTML = rows.map(([label, value]) => `
    <article class="info-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `).join('');
}

function renderAccountDetails(session) {
  const host = $('account-grid');
  if (!host) return;

  const rows = [
    ['User Name', session?.name || '-'],
    ['Email', session?.email || '-'],
    ['Role', session?.role || '-'],
    ['Branch ID', session?.branchId || '-'],
  ];

  host.innerHTML = rows.map(([label, value]) => `
    <article class="info-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `).join('');
}

async function loadDashboard() {
  const session = getSession();
  if (!session || (session.role !== 'branch_admin' && session.role !== 'admin')) {
    window.location.href = '../login.html';
    return;
  }

  renderHeader();
  renderAccountDetails(session);
  lucide.createIcons();

  if (!session.branchId) {
    renderBranchDetails(null);
    return;
  }

  try {
    const branches = await apiRequest('/hospital-branches', { method: 'GET' });
    const branch = Array.isArray(branches)
      ? branches.find((item) => item.id === session.branchId) || null
      : null;

    renderBranchDetails(branch);
    if (!branch) {
      showToast('Your branch record could not be found.', 'error');
    }
  } catch (error) {
    renderBranchDetails(null);
    showToast(error.message || 'Unable to load branch data.', 'error');
  }
}

function bindEvents() {
  $('refresh-btn')?.addEventListener('click', () => {
    loadDashboard().catch((error) => {
      showToast(error.message || 'Unable to refresh dashboard.', 'error');
    });
  });

  $('logout-btn')?.addEventListener('click', logoutBranchAdmin);
}

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  loadDashboard().catch((error) => {
    console.error('Branch admin dashboard failed to load:', error);
    showToast(error.message || 'Unable to load dashboard.', 'error');
  });
});
