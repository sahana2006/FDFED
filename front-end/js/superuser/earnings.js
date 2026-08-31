const API_BASE_URL = 'http://localhost:3000';
const STORAGE_KEY = 'user';
const SELECTED_BRANCH_KEY = 'superadmin-selected-branch-id';

const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const $ = (id) => document.getElementById(id);

const state = {
  branches: [],
  selectedBranchId: '',
  overview: null,
};

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

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || 'Request failed.');
  }

  if (response.status === 204) return null;
  return response.json();
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

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(Number(amount) || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-IN').format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pct(part, total) {
  if (!total) return 0;
  return Math.max(Math.round((part / total) * 100), 2);
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function setBar(barId, valueId, value, total) {
  const bar = $(barId);
  if (bar) bar.style.width = `${pct(value, total)}%`;
  setText(valueId, formatCurrency(value));
}

async function loadShell() {
  const [sidebarResponse, headerResponse] = await Promise.all([
    fetch('./components/sidebar.html'),
    fetch('./components/header.html'),
  ]);

  $('sidebar-slot').innerHTML = await sidebarResponse.text();
  $('header-slot').innerHTML = await headerResponse.text();

  document.querySelectorAll('.nav-item').forEach((link) => link.classList.remove('active'));
  const activeLink = document.querySelector('[data-nav="earnings"]');
  if (activeLink) activeLink.classList.add('active');

  const session = getSession();
  const headerTitle = $('header-page-title');
  if (headerTitle) headerTitle.textContent = 'Earnings';
  const userName = document.querySelector('.user-name');
  if (userName) userName.textContent = session?.name || 'Super Admin';

  lucide.createIcons();
}

async function loadOverview() {
  const data = await apiRequest('/super-admin/hospital-branches/earnings');
  state.overview = data;

  setText('overview-this-month', formatCurrency(data.currentMonthRevenue ?? data.thisMonthEarnings ?? 0));
  setText('overview-total', formatCurrency(data.totalRevenue ?? data.totalEarnings ?? 0));
  setText('overview-completed', formatNumber(data.completedAppointmentsCount ?? 0));
  setText('overview-branches', formatNumber(data.totalBranchesWithRevenue ?? data.branches?.length ?? 0));
}

function renderBranchOptions(branches) {
  const select = $('branch-select');
  if (!select) return;

  if (!branches.length) {
    select.innerHTML = '<option value="">No branches available</option>';
    select.disabled = true;
    setText('branch-select-note', 'No branches were found.');
    return;
  }

  select.disabled = false;
  select.innerHTML = [
    '<option value="">Select a branch</option>',
    ...branches.map((branch) => `
      <option value="${escapeHtml(branch.id)}">
        ${escapeHtml(branch.branchName)} · ${escapeHtml(branch.hospitalName || '')} · ${escapeHtml(branch.city || '-')}, ${escapeHtml(branch.state || '-')}
      </option>
    `),
  ].join('');

  const savedBranchId = localStorage.getItem(SELECTED_BRANCH_KEY) || '';
  const firstBranchId = branches[0]?.id || '';
  const selectedId = branches.some((branch) => branch.id === savedBranchId) ? savedBranchId : firstBranchId;
  select.value = selectedId;
  state.selectedBranchId = selectedId;

  setText('branch-select-note', selectedId ? 'Showing earnings for the selected branch.' : 'Choose a branch to view its earnings.');
}

function monthLabelForToday() {
  const now = new Date();
  return `${MONTHS_LONG[now.getMonth()]} ${now.getFullYear()}`;
}

function renderDoctorBreakdown(entries) {
  const container = $('doctorBreakdownList');
  if (!container) return;

  const byDoctor = {};
  entries.forEach((entry) => {
    if (!byDoctor[entry.doctorId]) {
      byDoctor[entry.doctorId] = {
        name: entry.doctorName || entry.doctorId,
        cut: 0,
        pct: entry.percentageCut || 0,
        count: 0,
      };
    }
    byDoctor[entry.doctorId].cut += Number(entry.doctorEarning || 0);
    byDoctor[entry.doctorId].count += 1;
  });

  const doctors = Object.values(byDoctor).sort((a, b) => b.cut - a.cut);

  if (!doctors.length) {
    container.innerHTML = `
      <div class="mini-item">
        <div class="mini-meta">No completed appointments this month.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = doctors.map((doctor) => `
    <div class="mini-item">
      <div>
        <div class="mini-label">${escapeHtml(doctor.name)}</div>
        <div class="mini-meta">${doctor.pct}% cut · ${doctor.count} appointment${doctor.count !== 1 ? 's' : ''}</div>
      </div>
      <div class="mini-value cut-value">${formatCurrency(doctor.cut)}</div>
    </div>
  `).join('');
}

function renderLedger(entries) {
  const tbody = $('ledgerTbody');
  if (!tbody) return;

  if (!entries.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:32px;color:#64748b;">
          No completed appointments for this branch.
        </td>
      </tr>
    `;
    return;
  }

  const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));

  tbody.innerHTML = sorted.map((entry) => `
    <tr>
      <td>${formatDate(entry.date)}</td>
      <td><strong>${escapeHtml(entry.patientName)}</strong></td>
      <td>${escapeHtml(entry.doctorName)}</td>
      <td><code style="font-size:.78rem;color:#64748b;">${escapeHtml(entry.appointmentId)}</code></td>
      <td><span class="revenue-badge">${formatCurrency(entry.consultationFee)}</span></td>
      <td class="td-cut-col">${escapeHtml(entry.percentageCut)}% → ${formatCurrency(entry.doctorEarning)}</td>
      <td class="td-doc-earn">${formatCurrency(entry.doctorEarning)}</td>
      <td class="td-branch-profit">${formatCurrency(entry.branchProfit)}</td>
    </tr>
  `).join('');
}

function renderBranchEarnings(data) {
  const branch = data?.branch || {};
  const entries = Array.isArray(data?.entries) ? data.entries : [];
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthLabel = `${MONTHS_LONG[currentMonth]} ${currentYear}`;

  const monthEntries = entries.filter((entry) => {
    const date = new Date(`${entry.date}T00:00:00`);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const monthRevenue = monthEntries.reduce((sum, entry) => sum + Number(entry.consultationFee || 0), 0);
  const monthCuts = monthEntries.reduce((sum, entry) => sum + Number(entry.doctorEarning || 0), 0);
  const monthProfit = monthEntries.reduce((sum, entry) => sum + Number(entry.branchProfit || 0), 0);

  setText('branchHeroTitle', `${branch.branchName || 'Branch'} - ${branch.hospitalName || 'Hospital'}`);
  setText('branchHeroSub', `${branch.city || '—'}, ${branch.state || '—'} | ${branch.email || 'No email provided'}`);
  setText('heroBadgeValue', formatCurrency(monthRevenue));
  setText('heroBadgeNote', monthLabel);

  setText('kpiTotalRevenue', formatCurrency(data.totalRevenue ?? 0));
  setText('kpiMonthRevenue', formatCurrency(monthRevenue));
  setText('kpiTotalCuts', formatCurrency(data.totalDoctorCuts ?? 0));
  setText('kpiMonthProfit', formatCurrency(monthProfit));
  setText('kpiMonthLabel', monthLabel);

  setText('summaryMonthTitle', monthLabel);
  setText('summaryCount', `${monthEntries.length} Completed`);
  setBar('barRevenue', 'barRevenueVal', monthRevenue, monthRevenue);
  setBar('barCuts', 'barCutsVal', monthCuts, monthRevenue);
  setBar('barProfit', 'barProfitVal', monthProfit, monthRevenue);

  setText('healthTotal', formatNumber(data.completedAppointmentsCount ?? entries.length));
  setText('healthMonth', formatNumber(monthEntries.length));
  setText('healthMargin', monthRevenue ? `${Math.round((monthProfit / monthRevenue) * 100)}%` : '—');

  setText('allTimeRevenue', formatCurrency(data.totalRevenue ?? 0));
  setText('allTimeCuts', formatCurrency(data.totalDoctorCuts ?? 0));
  setText('allTimeProfit', formatCurrency(data.branchProfit ?? 0));

  setText('ledgerMonthLabel', monthLabel);
  setText('ledgerCount', `${monthEntries.length} appointments`);
  renderDoctorBreakdown(monthEntries);
  renderLedger(monthEntries);
}

async function loadBranches() {
  const branches = await apiRequest('/super-admin/hospital-branches');
  state.branches = Array.isArray(branches) ? branches : [];
  renderBranchOptions(state.branches);
}

async function loadSelectedBranchEarnings(branchId) {
  if (!branchId) {
    return;
  }

  setText('branch-select-note', 'Loading branch earnings...');
  const data = await apiRequest(`/super-admin/hospital-branches/${encodeURIComponent(branchId)}/earnings`);
  renderBranchEarnings(data);
  localStorage.setItem(SELECTED_BRANCH_KEY, branchId);
  const branch = state.branches.find((item) => item.id === branchId);
  setText('branch-select-note', branch ? `Showing earnings for ${branch.branchName}.` : 'Showing earnings for selected branch.');
}

async function init() {
  const user = getSession();
  if (!user || user.role !== 'super_admin') {
    window.location.href = '../login.html';
    return;
  }

  try {
    await loadShell();
    await Promise.all([loadOverview(), loadBranches()]);

    if (state.selectedBranchId) {
      await loadSelectedBranchEarnings(state.selectedBranchId);
    }
  } catch (error) {
    console.error('Failed to initialize super admin earnings:', error);
    showToast(error.message || 'Unable to load earnings.', 'error');
  }

  $('branch-select')?.addEventListener('change', async (event) => {
    const branchId = event.target.value;
    state.selectedBranchId = branchId;
    if (!branchId) {
      localStorage.removeItem(SELECTED_BRANCH_KEY);
      return;
    }

    try {
      await loadSelectedBranchEarnings(branchId);
    } catch (error) {
      console.error('Failed to load selected branch earnings:', error);
      showToast(error.message || 'Unable to load branch earnings.', 'error');
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
