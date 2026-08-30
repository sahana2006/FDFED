const API_BASE_URL = 'http://localhost:3000';
const STORAGE_KEY = 'user';

const $ = (id) => document.getElementById(id);

const state = {
  doctors: [],
  frontdesk: [],
  labTechnicians: [],
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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeSearch(value) {
  return String(value || '').trim().toLowerCase();
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

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

function renderHeaderShell() {
  const session = getSession();
  const title = $('header-page-title');
  const subtitle = $('header-page-subtitle');
  const userName = document.querySelector('.user-name');
  const userRole = document.querySelector('.user-role');

  if (title) title.textContent = 'Branch Statistics';
  if (subtitle) subtitle.textContent = 'Super Admin Portal';
  if (userName) userName.textContent = session?.name || 'Super Admin';
  if (userRole) userRole.textContent = 'Super Admin';
}

async function loadShell() {
  const [sidebarResponse, headerResponse] = await Promise.all([
    fetch('./components/sidebar.html'),
    fetch('./components/header.html'),
  ]);

  $('sidebar-slot').innerHTML = await sidebarResponse.text();
  $('header-slot').innerHTML = await headerResponse.text();

  document.querySelectorAll('.nav-item').forEach((link) => link.classList.remove('active'));
  renderHeaderShell();
  lucide.createIcons();
}

function getBranchId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('branchId') || '';
}

function renderBranchDetails(branch) {
  const host = $('branch-details');
  if (!host) return;

  host.innerHTML = [
    ['Hospital Name', branch.hospitalName],
    ['Branch Name', branch.branchName],
    ['Address', branch.address],
    ['City', branch.city],
    ['State', branch.state],
    ['Pincode', branch.pincode],
    ['Phone', branch.phone],
    ['Email', branch.email],
    ['Status', branch.status],
  ].map(([label, value]) => `
    <div class="detail-row">
      <div class="label">${escapeHtml(label)}</div>
      <div class="value">${escapeHtml(value || '—')}</div>
    </div>
  `).join('');

  $('branch-title').textContent = `${branch.branchName} - ${branch.hospitalName}`;
  $('branch-subtitle').textContent = `${branch.city || '—'}, ${branch.state || '—'} | ${branch.email || 'No email provided'}`;
}

function renderSummary(summary) {
  $('count-doctors').textContent = summary.totalDoctors ?? 0;
  $('count-appointments').textContent = summary.totalAppointments ?? 0;
  $('count-frontdesks').textContent = summary.totalFrontdesks ?? 0;
  $('count-labtechs').textContent = summary.totalLabTechnicians ?? 0;
}

function renderDoctors(doctors) {
  const tbody = $('doctors-body');
  if (!tbody) return;

  if (!doctors.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No doctors found for this branch.</td></tr>';
    return;
  }

  tbody.innerHTML = doctors.map((doctor) => `
    <tr>
      <td>
        <div style="font-weight:700;color:#0f172a;">${escapeHtml(doctor.name)}</div>
        <div style="font-size:0.8rem;color:#64748b;">${escapeHtml(doctor.email)}</div>
      </td>
      <td>${escapeHtml(doctor.specialization || '—')}</td>
      <td>${escapeHtml(doctor.department || '—')}</td>
      <td>${doctor.experience != null ? `${escapeHtml(doctor.experience)} yrs` : '—'}</td>
      <td>
        <div>${escapeHtml(doctor.phone || '—')}</div>
        <div style="font-size:0.8rem;color:#64748b;">${escapeHtml(doctor.gender || '—')}</div>
      </td>
      <td>${escapeHtml(doctor.qualification || '—')}</td>
    </tr>
  `).join('');
}

function renderFrontdesk(frontdesk) {
  const tbody = $('frontdesk-body');
  if (!tbody) return;

  if (!frontdesk.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No front desk staff found for this branch.</td></tr>';
    return;
  }

  tbody.innerHTML = frontdesk.map((staff) => {
    const shift = staff.shiftStart && staff.shiftEnd ? `${staff.shiftStart} - ${staff.shiftEnd}` : '—';
    const languages = Array.isArray(staff.languages) && staff.languages.length ? staff.languages.join(', ') : '—';
    return `
      <tr>
        <td>
          <div style="font-weight:700;color:#0f172a;">${escapeHtml(staff.name)}</div>
          <div style="font-size:0.8rem;color:#64748b;">${escapeHtml(staff.email)}</div>
        </td>
        <td>${escapeHtml(staff.counter || '—')}</td>
        <td>${escapeHtml(shift)}</td>
        <td>${escapeHtml(languages)}</td>
        <td>
          <div>${escapeHtml(staff.phone || '—')}</div>
          <div style="font-size:0.8rem;color:#64748b;">${escapeHtml(staff.gender || '—')}</div>
        </td>
        <td>${escapeHtml(staff.reportingManagerId || '—')}</td>
      </tr>
    `;
  }).join('');
}

function renderLabTechs(labTechs) {
  const tbody = $('labtech-body');
  if (!tbody) return;

  if (!labTechs.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No lab technicians found for this branch.</td></tr>';
    return;
  }

  tbody.innerHTML = labTechs.map((tech) => `
    <tr>
      <td>
        <div style="font-weight:700;color:#0f172a;">${escapeHtml(tech.name)}</div>
        <div style="font-size:0.8rem;color:#64748b;">Lab Technician</div>
      </td>
      <td>${escapeHtml(tech.email)}</td>
      <td>${escapeHtml(tech.branchId || '—')}</td>
      <td>${formatDate(tech.createdAt)}</td>
    </tr>
  `).join('');
}

function applyDoctorSearch() {
  const query = normalizeSearch($('doctor-search')?.value || '');
  const filtered = !query
    ? state.doctors
    : state.doctors.filter((doctor) => [
        doctor.name,
        doctor.email,
        doctor.specialization,
        doctor.department,
        doctor.qualification,
        doctor.phone,
        doctor.gender,
        doctor.licenseNo,
      ]
        .filter(Boolean)
        .some((value) => normalizeSearch(value).includes(query)));

  renderDoctors(filtered);
}

function applyFrontdeskSearch() {
  const query = normalizeSearch($('frontdesk-search')?.value || '');
  const filtered = !query
    ? state.frontdesk
    : state.frontdesk.filter((staff) => [
        staff.name,
        staff.email,
        staff.phone,
        staff.gender,
        staff.reportingManagerId,
        staff.counter,
        Array.isArray(staff.languages) ? staff.languages.join(' ') : '',
        staff.shiftStart,
        staff.shiftEnd,
      ]
        .filter(Boolean)
        .some((value) => normalizeSearch(value).includes(query)));

  renderFrontdesk(filtered);
}

function applyLabTechSearch() {
  const query = normalizeSearch($('labtech-search')?.value || '');
  const filtered = !query
    ? state.labTechnicians
    : state.labTechnicians.filter((tech) => [
        tech.name,
        tech.email,
        tech.branchId,
      ]
        .filter(Boolean)
        .some((value) => normalizeSearch(value).includes(query)));

  renderLabTechs(filtered);
}

async function loadStatistics() {
  const branchId = getBranchId();
  if (!branchId) {
    showToast('Missing branchId in URL.', 'error');
    return;
  }

  const payload = await apiRequest(`/super-admin/hospital-branches/${encodeURIComponent(branchId)}/statistics`);
  renderBranchDetails(payload.branch);
  renderSummary(payload.summary || {});
  state.doctors = Array.isArray(payload.doctors) ? payload.doctors : [];
  state.frontdesk = Array.isArray(payload.frontdesk) ? payload.frontdesk : [];
  state.labTechnicians = Array.isArray(payload.labTechnicians) ? payload.labTechnicians : [];
  applyDoctorSearch();
  applyFrontdeskSearch();
  applyLabTechSearch();
}

async function init() {
  const user = getSession();
  if (!user || user.role !== 'super_admin') {
    window.location.href = '../login.html';
    return;
  }

  try {
    await loadShell();
    await loadStatistics();
  } catch (error) {
    console.error('Failed to initialize branch statistics page:', error);
    showToast(error.message || 'Unable to load branch statistics.', 'error');
  }

  $('back-btn')?.addEventListener('click', () => {
    window.location.href = './dashboard.html';
  });

  $('doctor-search')?.addEventListener('input', applyDoctorSearch);
  $('frontdesk-search')?.addEventListener('input', applyFrontdeskSearch);
  $('labtech-search')?.addEventListener('input', applyLabTechSearch);
}

document.addEventListener('DOMContentLoaded', init);
