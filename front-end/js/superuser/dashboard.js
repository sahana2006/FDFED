const API_BASE_URL = 'http://localhost:3000';
const STORAGE_KEY = 'user';

const state = {
  dashboard: null,
  branches: [],
  filteredBranches: [],
};

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
  const headers = { ...extra };

  if (session?.role) headers.role = session.role;
  if (session?.id) headers['x-user-id'] = session.id;

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

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-IN').format(Number(value) || 0);
}

function formatNullableNumber(value) {
  return value == null ? '—' : formatNumber(value);
}

function formatStatus(status) {
  return String(status || '').toLowerCase() === 'active' ? 'Active' : 'Inactive';
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

function logoutSuperUser(event) {
  event?.preventDefault();
  localStorage.removeItem(STORAGE_KEY);
  window.location.href = '../login.html';
}

function renderHeaderShell() {
  const session = getSession();
  const headerTitle = $('header-page-title');
  const headerSubtitle = $('header-page-subtitle');
  const userName = document.querySelector('.user-name');
  const userRole = document.querySelector('.user-role');

  if (headerTitle) headerTitle.textContent = 'Branch Setup';
  if (headerSubtitle) headerSubtitle.textContent = 'Super Admin Portal';
  if (userName) userName.textContent = session?.name || 'Super Admin';
  if (userRole) userRole.textContent = 'Super Admin';
}

function activateSidebarNav() {
  document.querySelectorAll('.nav-item').forEach((link) => link.classList.remove('active'));
  const activeLink = document.querySelector('[data-nav="dashboard"]');
  if (activeLink) activeLink.classList.add('active');
}

async function loadShell() {
  const [sidebarResponse, headerResponse] = await Promise.all([
    fetch('./components/sidebar.html'),
    fetch('./components/header.html'),
  ]);

  const [sidebarHtml, headerHtml] = await Promise.all([
    sidebarResponse.text(),
    headerResponse.text(),
  ]);

  const sidebarSlot = $('sidebar-slot');
  const headerSlot = $('header-slot');
  if (sidebarSlot) sidebarSlot.innerHTML = sidebarHtml;
  if (headerSlot) headerSlot.innerHTML = headerHtml;

  activateSidebarNav();
  renderHeaderShell();
  lucide.createIcons();
}

function renderBranchAdminOptions(branches) {
  const select = $('assign-branch-id');
  if (!select) return;

  const availableBranches = branches.filter((branch) => !branch.branchAdmin);
  if (!availableBranches.length) {
    select.innerHTML = '<option value="">No unassigned branches available</option>';
    select.disabled = true;
    return;
  }

  select.disabled = false;
  select.innerHTML = ['<option value="">Select a branch</option>', ...availableBranches.map((branch) => `
    <option value="${escapeHtml(branch.id)}">${escapeHtml(branch.branchName)} · ${escapeHtml(branch.city || '-')} · ${escapeHtml(branch.state || '-')}</option>
  `)].join('');
}

function branchAdminMarkup(branchAdmin) {
  if (!branchAdmin) {
    return '<span class="muted-badge">Unassigned</span>';
  }

  return `
    <div class="admin-cell">
      <div class="admin-name">${escapeHtml(branchAdmin.name)}</div>
      <div class="admin-email">${escapeHtml(branchAdmin.email)}</div>
      <div class="admin-phone">${escapeHtml(branchAdmin.phone || '-')}</div>
    </div>
  `;
}

function openBranchStatistics(branchId) {
  window.location.href = `./branch-statistics.html?branchId=${encodeURIComponent(branchId)}`;
}

function renderBranches(branches) {
  const tbody = $('branch-table-body');
  if (!tbody) return;

  if (!branches.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">No branches match your search.</td>
      </tr>
    `;
    lucide.createIcons();
    return;
  }

  tbody.innerHTML = branches.map((branch) => {
    const isInactive = String(branch.status || '').toLowerCase() !== 'active';

    return `
      <tr data-branch-id="${escapeHtml(branch.id)}">
        <td>
          <div class="branch-title">${escapeHtml(branch.branchName)}</div>
          <div class="branch-subtitle">${escapeHtml(branch.hospitalName || '')}</div>
        </td>
        <td>${escapeHtml(branch.city || '-')}</td>
        <td>${escapeHtml(branch.state || '-')}</td>
        <td><span class="status-badge ${isInactive ? 'inactive' : 'active'}">${escapeHtml(formatStatus(branch.status))}</span></td>
        <td>${branchAdminMarkup(branch.branchAdmin)}</td>
        <td>
          <button
            type="button"
            class="primary-btn"
            style="padding: 0.55rem 0.9rem; font-size: 0.85rem;"
            onclick="openBranchStatistics('${escapeHtml(branch.id)}')"
          >
            View
          </button>
        </td>
      </tr>
    `;
  }).join('');

  lucide.createIcons();
}

function normalizeSearch(value) {
  return String(value || '').trim().toLowerCase();
}

function applySearch() {
  const query = normalizeSearch($('branch-search-input')?.value || '');
  if (!query) {
    state.filteredBranches = [...state.branches];
    renderBranches(state.filteredBranches);
    return;
  }

  state.filteredBranches = state.branches.filter((branch) => {
    const admin = branch.branchAdmin;
    return [
      branch.hospitalName,
      branch.branchName,
      branch.city,
      branch.state,
      branch.status,
      admin?.name,
      admin?.email,
      admin?.phone,
    ]
      .filter(Boolean)
      .some((value) => normalizeSearch(value).includes(query));
  });

  renderBranches(state.filteredBranches);
}

function resetCreateForm() {
  $('create-branch-form')?.reset();
}

function resetAssignForm() {
  $('assign-admin-form')?.reset();
  const select = $('assign-branch-id');
  if (select && select.options.length > 1) {
    select.value = '';
  }
}

function populateBranchSelect(branches) {
  renderBranchAdminOptions(branches);
}

async function createBranch(event) {
  event.preventDefault();

  const payload = {
    hospitalName: $('create-hospital-name').value.trim(),
    branchName: $('create-branch-name').value.trim(),
    address: $('create-address').value.trim(),
    city: $('create-city').value.trim(),
    state: $('create-state').value.trim(),
    pincode: $('create-pincode').value.trim(),
    phone: $('create-phone').value.trim(),
    email: $('create-email').value.trim(),
  };

  const form = $('create-branch-form');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  try {
    await apiRequest('/super-admin/hospital-branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    showToast('Branch created successfully.');
    resetCreateForm();
    await refreshDashboard();
  } catch (error) {
    showToast(error.message || 'Unable to create branch.', 'error');
  }
}

async function createBranchAdmin(event) {
  event.preventDefault();
  const branchId = $('assign-branch-id').value;

  if (!branchId) {
    showToast('Please select an unassigned branch first.', 'error');
    return;
  }

  const payload = {
    name: $('assign-name').value.trim(),
    email: $('assign-email').value.trim(),
    phone: $('assign-phone').value.trim(),
    password: $('assign-password').value,
    branchId,
  };

  try {
    await apiRequest('/super-admin/branch-admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    showToast('Branch admin created successfully.');
    resetAssignForm();
    await refreshDashboard();
  } catch (error) {
    showToast(error.message || 'Unable to create branch admin.', 'error');
  }
}

async function refreshDashboard() {
  const payload = await apiRequest('/super-admin/dashboard', { method: 'GET' });
  state.dashboard = payload;
  state.branches = Array.isArray(payload?.branches) ? payload.branches : [];
  state.filteredBranches = [...state.branches];
  populateBranchSelect(state.branches);
  renderBranches(state.filteredBranches);
}

function bindEvents() {
  $('branch-search-input')?.addEventListener('input', applySearch);
  $('create-branch-form')?.addEventListener('submit', createBranch);
  $('assign-admin-form')?.addEventListener('submit', createBranchAdmin);
  $('superuser-logout')?.addEventListener('click', logoutSuperUser);
}

async function init() {
  const user = getSession();
  if (!user || user.role !== 'super_admin') {
    window.location.href = '../login.html';
    return;
  }

  try {
    await loadShell();
    bindEvents();
    await refreshDashboard();
  } catch (error) {
    console.error('Failed to initialize super admin dashboard:', error);
    showToast(error.message || 'Unable to load dashboard.', 'error');
  }
}

document.addEventListener('DOMContentLoaded', init);
