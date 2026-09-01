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
  branchEarnings: null,
  selectedMonthKey: '',
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

function formatDate(dateStr) {
  if (!dateStr) return '\u2014';
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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

function getMonthKeyFromDate(dateStr) {
  if (!dateStr) return '';
  const rawDate = String(dateStr);
  const d = new Date(rawDate.length === 10 ? `${rawDate}T00:00:00` : rawDate);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(monthKey, fallbackDate = new Date()) {
  if (!monthKey) {
    return `${MONTHS_LONG[fallbackDate.getMonth()]} ${fallbackDate.getFullYear()}`;
  }

  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) {
    return `${MONTHS_LONG[fallbackDate.getMonth()]} ${fallbackDate.getFullYear()}`;
  }

  return `${MONTHS_LONG[month - 1]} ${year}`;
}

function getAvailableMonthKeys(data) {
  const keys = new Set();
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const allAppointments = Array.isArray(data?.entries) ? data.entries : [];
  const allLabEntries = Array.isArray(data?.labEntries) ? data.labEntries : [];

  allAppointments.forEach((entry) => {
    const key = getMonthKeyFromDate(entry.date);
    if (key && key <= currentKey && Number(entry.consultationFee || 0) > 0) keys.add(key);
  });

  allLabEntries.forEach((entry) => {
    const key = getMonthKeyFromDate(entry.date);
    if (key && key <= currentKey && Number(entry.testPrice || 0) > 0) keys.add(key);
  });

  keys.add(currentKey);

  return [...keys].sort((a, b) => b.localeCompare(a));
}

function resolveDefaultMonthKey(monthKeys) {
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (monthKeys.includes(currentKey)) return currentKey;
  return monthKeys[0] || currentKey;
}

function ensureMonthFilter() {
  const heroBadge = $('heroBadge');
  const heroSection = heroBadge?.parentElement;
  if (!heroBadge || !heroSection || $('monthSelect')) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'hero-controls';
  heroSection.insertBefore(wrapper, heroBadge);
  wrapper.appendChild(heroBadge);
  wrapper.insertAdjacentHTML('afterbegin', `
    <label class="month-filter">
      <span>Month</span>
      <select id="monthSelect" aria-label="Select revenue month"></select>
    </label>
  `);

  const select = $('monthSelect');
  if (select && !select.dataset.bound) {
    select.addEventListener('change', () => {
      state.selectedMonthKey = select.value;
      if (state.branchEarnings) {
        renderBranchEarnings(state.branchEarnings, state.selectedMonthKey);
      }
    });
    select.dataset.bound = '1';
  }
}

function populateMonthSelect(monthKeys, selectedKey) {
  const select = $('monthSelect');
  if (!select) return;

  select.innerHTML = monthKeys.map((key) => `
    <option value="${key}">${escapeHtml(getMonthLabel(key))}</option>
  `).join('');
  select.disabled = !monthKeys.length;
  if (selectedKey) {
    select.value = selectedKey;
  }
}

function logoutSuperUser(event) {
  event?.preventDefault();
  localStorage.removeItem(STORAGE_KEY);
  window.location.href = '../login.html';
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

  ensureMonthFilter();
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
        ${escapeHtml(branch.branchName)} \u00b7 ${escapeHtml(branch.hospitalName || '')} \u00b7 ${escapeHtml(branch.city || '-')}, ${escapeHtml(branch.state || '-')}
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

function renderDoctorBreakdown(entries) {
  const container = $('doctorBreakdownList');
  if (!container) return;

  const byDoctor = {};
  entries.forEach((entry) => {
    const doctorId = entry.doctorId || entry.doctorName || 'unknown-doctor';
    if (!byDoctor[doctorId]) {
      byDoctor[doctorId] = {
        name: entry.doctorName || entry.doctorId || 'Unknown doctor',
        cut: 0,
        pct: Number(entry.percentageCut || 0),
        count: 0,
      };
    }
    byDoctor[doctorId].cut += Number(entry.doctorEarning || 0);
    byDoctor[doctorId].count += 1;
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
        <div class="mini-meta">${doctor.pct}% cut \u00b7 ${doctor.count} appointment${doctor.count !== 1 ? 's' : ''}</div>
      </div>
      <div class="mini-value cut-value">${formatCurrency(doctor.cut)}</div>
    </div>
  `).join('');
}



function renderBranchEarnings(data, selectedMonthKey) {
  const branch = data?.branch || state.branches.find(b => b.id === state.selectedBranchId) || {};
  const entries = Array.isArray(data?.entries) ? data.entries : [];
  const allLabEntries = Array.isArray(data?.labEntries) ? data.labEntries : [];
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthKeys = getAvailableMonthKeys(data);
  const monthKey = monthKeys.includes(selectedMonthKey)
    ? selectedMonthKey
    : resolveDefaultMonthKey(monthKeys);
  const monthLabel = getMonthLabel(monthKey, now);

  const monthEntries = entries.filter((entry) => getMonthKeyFromDate(entry.date) === monthKey);
  const monthLabEntries = allLabEntries.filter((entry) => getMonthKeyFromDate(entry.date) === monthKey);

  const monthAppointmentRevenue = monthEntries.reduce((sum, entry) => sum + Number(entry.consultationFee || 0), 0);
  const monthLabRevenue = monthLabEntries.reduce((sum, entry) => sum + Number(entry.testPrice || 0), 0);
  const monthRevenue = monthAppointmentRevenue + monthLabRevenue;
  const monthCuts = monthEntries.reduce((sum, entry) => sum + Number(entry.doctorEarning || 0), 0);
  const monthAppointmentProfit = monthEntries.reduce((sum, entry) => sum + Number(entry.branchProfit || 0), 0);
  const monthProfit = monthAppointmentProfit + monthLabRevenue;
  const averageTicket = (monthEntries.length || monthLabEntries.length)
    ? monthRevenue / (monthEntries.length + monthLabEntries.length)
    : 0;

  const doctorCutTotals = monthEntries.reduce((acc, entry) => {
    const doctorKey = entry.doctorId || entry.doctorName || 'Unknown';
    acc[doctorKey] = (acc[doctorKey] || 0) + Number(entry.doctorEarning || 0);
    return acc;
  }, {});
  const topDoctorCut = Object.values(doctorCutTotals).reduce((max, value) => Math.max(max, value), 0);
  const topDoctorShare = monthCuts ? Math.round((topDoctorCut / monthCuts) * 100) : 0;
  const profitEfficiency = monthRevenue ? Math.round((monthProfit / monthRevenue) * 100) : 0;

  const badgeLabel = $('heroBadge')?.querySelector('.branch-badge-label');
  if (badgeLabel) {
    badgeLabel.textContent = monthKey === currentKey ? 'Current Month' : 'Selected Month';
  }

  const summaryEyebrow = document.querySelector('.analytics-panel .panel-eyebrow');
  const summaryCopy = document.querySelector('.analytics-panel .panel-copy');
  if (summaryEyebrow) {
    summaryEyebrow.textContent = monthKey === currentKey ? "This Month's Summary" : 'Selected Month Summary';
  }
  if (summaryCopy) {
    summaryCopy.textContent = `Revenue vs doctor cuts vs branch profit for ${monthLabel}.`;
  }

  setText('branchHeroTitle', `${branch.branchName || 'Branch'} - ${branch.hospitalName || 'Hospital'}`);
  const subEl = $('branchHeroSub');
  if (subEl) {
    subEl.innerHTML = `${escapeHtml(branch.city || '\u2014')}, ${escapeHtml(branch.state || '\u2014')}<br>${escapeHtml(branch.email || 'No email provided')}`;
  }
  setText('heroBadgeValue', formatCurrency(monthRevenue));
  setText('heroBadgeNote', monthLabel);

  setText('kpiTotalRevenue', formatCurrency(data.totalRevenue ?? 0));
  setText('kpiMonthRevenue', formatCurrency(monthRevenue));
  setText('kpiTotalCuts', formatCurrency(data.totalDoctorCuts ?? 0));
  setText('kpiLabRevenue', formatCurrency(monthLabRevenue));
  setText('kpiMonthProfit', formatCurrency(monthProfit));
  setText('kpiMonthLabel', monthLabel);

  setText('summaryMonthTitle', monthLabel);
  setText('summaryCount', `${monthEntries.length} Appointments \u00b7 ${monthLabEntries.length} Lab Tests`);
  setBar('barRevenue', 'barRevenueVal', monthRevenue, monthRevenue);
  setBar('barCuts', 'barCutsVal', monthCuts, monthRevenue);
  setBar('barProfit', 'barProfitVal', monthProfit, monthRevenue);

  setText('healthTotal', formatNumber(data.completedAppointmentsCount ?? entries.length));
  setText('healthMonth', formatNumber(monthEntries.length));
  setText('healthMargin', monthRevenue ? `${Math.round((monthProfit / monthRevenue) * 100)}%` : '\u2014');

  setText('insightAvgTicket', formatCurrency(averageTicket));
  setText('insightTopDoctorShare', `${topDoctorShare}%`);
  setText('insightProfitEfficiency', `${profitEfficiency}%`);

  renderDoctorBreakdown(monthEntries);
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
  state.branchEarnings = data;

  const monthKeys = getAvailableMonthKeys(data);
  state.selectedMonthKey = resolveDefaultMonthKey(monthKeys);
  populateMonthSelect(monthKeys, state.selectedMonthKey);
  renderBranchEarnings(data, state.selectedMonthKey);

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

  $('superuser-logout')?.addEventListener('click', logoutSuperUser);
}

document.addEventListener('DOMContentLoaded', init);
