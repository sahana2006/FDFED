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

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-IN').format(Number(value) || 0);
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

function setModalOpen(modalId, open) {
  const modal = $(modalId);
  if (!modal) return;
  modal.classList.toggle('hidden', !open);
  modal.setAttribute('aria-hidden', String(!open));
}

function closeAllModals() {
  setModalOpen('view-modal', false);
  setModalOpen('edit-modal', false);
  setModalOpen('assign-modal', false);
}

function renderHeaderShell() {
  const session = getSession();
  const headerTitle = $('header-page-title');
  const headerSubtitle = $('header-page-subtitle');
  const userName = document.querySelector('.user-name');
  const userRole = document.querySelector('.user-role');

  if (headerTitle) headerTitle.textContent = 'Super Admin Dashboard';
  if (headerSubtitle) headerSubtitle.textContent = 'Super Admin Portal';
  if (userName) userName.textContent = session?.name || 'Super Admin';
  if (userRole) userRole.textContent = session?.role === 'admin' ? 'Branch Admin' : 'Super Admin';
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

function summaryCard(key, label, value, icon, tone) {
  return `
    <article class="summary-card ${key}">
      <div class="meta">
        <div>
          <div class="label">${escapeHtml(label)}</div>
          <div class="value">${formatNumber(value)}</div>
        </div>
        <div class="icon ${tone}"><i data-lucide="${icon}"></i></div>
      </div>
    </article>
  `;
}

function renderSummaryCards(summary) {
  const grid = $('summary-grid');
  if (!grid) return;

  grid.innerHTML = [
    summaryCard('total-branches', 'Total Hospital Branches', summary.totalBranches, 'building-2', 'tone-teal'),
    summaryCard('active-branches', 'Active Branches', summary.activeBranches, 'badge-check', 'tone-blue'),
    summaryCard('inactive-branches', 'Inactive Branches', summary.inactiveBranches, 'badge-alert', 'tone-amber'),
    summaryCard('total-doctors', 'Total Doctors', summary.totalDoctors, 'stethoscope', 'tone-sky'),
    summaryCard('total-patients', 'Total Patients', summary.totalPatients, 'users', 'tone-violet'),
    summaryCard('todays-appointments', "Today's Appointments", summary.todaysAppointments, 'calendar-clock', 'tone-emerald'),
    summaryCard('total-appointments', 'Total Appointments', summary.totalAppointments, 'calendar-range', 'tone-rose'),
  ].join('');
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

function renderBranches(branches) {
  const tbody = $('branch-table-body');
  if (!tbody) return;

  if (!branches.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">No branches match your search.</td>
      </tr>
    `;
    lucide.createIcons();
    return;
  }

  tbody.innerHTML = branches.map((branch) => {
    const isInactive = String(branch.status || '').toLowerCase() !== 'active';
    const adminAssigned = !!branch.branchAdmin;
    const disableDisabled = isInactive;

    return `
      <tr data-branch-id="${escapeHtml(branch.id)}">
        <td>
          <div class="branch-title">${escapeHtml(branch.branchName)}</div>
          <div class="branch-subtitle">${escapeHtml(branch.hospitalName || '')}</div>
        </td>
        <td>${escapeHtml(branch.city || '-')}</td>
        <td>${escapeHtml(branch.state || '-')}</td>
        <td><span class="status-badge ${isInactive ? 'inactive' : 'active'}">${escapeHtml(formatStatus(branch.status))}</span></td>
        <td>${formatNumber(branch.totalDoctors)}</td>
        <td>${formatNumber(branch.totalPatients)}</td>
        <td>${formatNumber(branch.totalAppointments)}</td>
        <td>${branchAdminMarkup(branch.branchAdmin)}</td>
        <td>
          <div class="actions-group">
            <button class="row-btn primary" type="button" data-action="view" data-branch-id="${escapeHtml(branch.id)}">
              <i data-lucide="eye"></i><span>View</span>
            </button>
            <button class="row-btn warn" type="button" data-action="edit" data-branch-id="${escapeHtml(branch.id)}">
              <i data-lucide="pencil"></i><span>Edit</span>
            </button>
            <button class="row-btn danger" type="button" data-action="disable" data-branch-id="${escapeHtml(branch.id)}" ${disableDisabled ? 'disabled' : ''}>
              <i data-lucide="ban"></i><span>Disable</span>
            </button>
            <button class="row-btn success" type="button" data-action="assign" data-branch-id="${escapeHtml(branch.id)}" ${adminAssigned ? 'disabled' : ''}>
              <i data-lucide="user-plus"></i><span>Assign Branch Admin</span>
            </button>
          </div>
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

function renderBranchDetails(branch) {
  const details = $('view-modal-details');
  const admin = $('view-modal-admin');
  const stats = $('view-modal-stats');
  const title = $('view-modal-title');

  if (title) title.textContent = branch.branchName;

  if (details) {
    details.innerHTML = [
      ['Hospital Name', branch.hospitalName || '-'],
      ['Branch Name', branch.branchName || '-'],
      ['City', branch.city || '-'],
      ['State', branch.state || '-'],
      ['Pincode', branch.pincode || '-'],
      ['Phone', branch.phone || '-'],
      ['Email', branch.email || '-'],
      ['Status', formatStatus(branch.status)],
    ].map(([label, value]) => `
      <div class="detail-card">
        <h4>${escapeHtml(label)}</h4>
        <p>${escapeHtml(value)}</p>
      </div>
    `).join('');
  }

  if (admin) {
    if (branch.branchAdmin) {
      admin.innerHTML = `
        <strong>Branch Admin</strong>
        <p>${escapeHtml(branch.branchAdmin.name)} · ${escapeHtml(branch.branchAdmin.email)}</p>
        <p>${escapeHtml(branch.branchAdmin.phone || '-')}</p>
      `;
    } else {
      admin.innerHTML = '<strong>Branch Admin</strong><p>No active Branch Admin assigned</p>';
    }
  }

  if (stats) {
    stats.innerHTML = [
      ['Doctors', branch.totalDoctors],
      ['Patients', branch.totalPatients],
      ['Appointments', branch.totalAppointments],
      ['Status', formatStatus(branch.status)],
    ].map(([label, value]) => `
      <div class="stat-card">
        <div class="stat-label">${escapeHtml(label)}</div>
        <div class="stat-value">${escapeHtml(value)}</div>
      </div>
    `).join('');
  }
}

function populateEditForm(branch) {
  $('edit-branch-id').value = branch.id;
  $('edit-hospital-name').value = branch.hospitalName || '';
  $('edit-branch-name').value = branch.branchName || '';
  $('edit-address').value = branch.address || '';
  $('edit-city').value = branch.city || '';
  $('edit-state').value = branch.state || '';
  $('edit-pincode').value = branch.pincode || '';
  $('edit-phone').value = branch.phone || '';
  $('edit-email').value = branch.email || '';
  $('edit-modal-title').textContent = `Update ${branch.branchName}`;
}

function populateAssignForm(branch) {
  $('assign-branch-id').value = branch.id;
  $('assign-name').value = '';
  $('assign-email').value = '';
  $('assign-phone').value = '';
  $('assign-password').value = '';
  $('assign-modal-title').textContent = `Create Branch Admin for ${branch.branchName}`;

  const target = $('assign-branch-target');
  if (target) {
    target.innerHTML = `
      <strong>${escapeHtml(branch.branchName)}</strong>
      <p>${escapeHtml(branch.city || '-')} · ${escapeHtml(branch.state || '-')}</p>
      <p>${escapeHtml(branch.hospitalName || '')}</p>
    `;
  }
}

function findBranchById(branchId) {
  return state.branches.find((branch) => branch.id === branchId) || null;
}

function openViewBranch(branchId) {
  const branch = findBranchById(branchId);
  if (!branch) return;
  renderBranchDetails(branch);
  setModalOpen('view-modal', true);
}

function openEditBranch(branchId) {
  const branch = findBranchById(branchId);
  if (!branch) return;
  populateEditForm(branch);
  setModalOpen('edit-modal', true);
}

function openAssignBranchAdmin(branchId) {
  const branch = findBranchById(branchId);
  if (!branch) return;
  populateAssignForm(branch);
  setModalOpen('assign-modal', true);
}

async function disableBranch(branchId) {
  const branch = findBranchById(branchId);
  if (!branch) return;

  const confirmed = window.confirm(`Disable ${branch.branchName}?`);
  if (!confirmed) return;

  try {
    await apiRequest(`/super-admin/hospital-branches/${encodeURIComponent(branchId)}/disable`, {
      method: 'PATCH',
    });
    showToast('Branch disabled successfully.');
    await refreshDashboard();
  } catch (error) {
    showToast(error.message || 'Unable to disable branch.', 'error');
  }
}

async function saveBranchEdits(event) {
  event.preventDefault();
  const branchId = $('edit-branch-id').value;

  const payload = {
    hospitalName: $('edit-hospital-name').value.trim(),
    branchName: $('edit-branch-name').value.trim(),
    address: $('edit-address').value.trim(),
    city: $('edit-city').value.trim(),
    state: $('edit-state').value.trim(),
    pincode: $('edit-pincode').value.trim(),
    phone: $('edit-phone').value.trim(),
    email: $('edit-email').value.trim(),
  };

  try {
    await apiRequest(`/super-admin/hospital-branches/${encodeURIComponent(branchId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    showToast('Branch updated successfully.');
    closeAllModals();
    await refreshDashboard();
  } catch (error) {
    showToast(error.message || 'Unable to update branch.', 'error');
  }
}

async function createBranchAdmin(event) {
  event.preventDefault();
  const branchId = $('assign-branch-id').value;

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
    showToast('Branch Admin created successfully.');
    closeAllModals();
    await refreshDashboard();
  } catch (error) {
    showToast(error.message || 'Unable to create Branch Admin.', 'error');
  }
}

async function refreshDashboard() {
  const payload = await apiRequest('/super-admin/dashboard', { method: 'GET' });
  state.dashboard = payload;
  state.branches = Array.isArray(payload?.branches) ? payload.branches : [];
  state.filteredBranches = [...state.branches];
  renderSummaryCards(payload?.summary || {});
  renderBranches(state.filteredBranches);
}

function bindEvents() {
  $('refresh-dashboard-btn')?.addEventListener('click', async () => {
    try {
      await refreshDashboard();
      showToast('Dashboard refreshed.');
    } catch (error) {
      showToast(error.message || 'Unable to refresh dashboard.', 'error');
    }
  });

  $('branch-search-input')?.addEventListener('input', applySearch);

  $('branch-table-body')?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const branchId = button.getAttribute('data-branch-id');
    const action = button.getAttribute('data-action');

    if (!branchId) return;
    if (action === 'view') openViewBranch(branchId);
    if (action === 'edit') openEditBranch(branchId);
    if (action === 'assign') openAssignBranchAdmin(branchId);
    if (action === 'disable') disableBranch(branchId);
  });

  document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => closeAllModals());
  });

  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        closeAllModals();
      }
    });
  });

  $('edit-branch-form')?.addEventListener('submit', saveBranchEdits);
  $('assign-admin-form')?.addEventListener('submit', createBranchAdmin);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeAllModals();
    }
  });
}

async function init() {
  const user = getSession();
  if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
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
