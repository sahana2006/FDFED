/* ============================================================
   dashboard.js — Branch Admin Dashboard
   FILE: front-end/js/branch-admin/dashboard.js
   ============================================================ */

function renderBranchDetails(branch) {
  const host = $('branchGrid');
  if (!host) return;

  if (!branch) {
    host.innerHTML = '<div class="empty-state"><div class="empty-icon">🏥</div><p>No branch linked to this account.</p></div>';
    return;
  }

  const fields = [
    ['Hospital Name', branch.hospitalName],
    ['Branch Name',  branch.branchName],
    ['City',         branch.city],
    ['State',        branch.state],
    ['Pincode',      branch.pincode],
    ['Phone',        branch.phone],
    ['Email',        branch.email],
    ['Status',       branch.status],
  ];

  host.innerHTML = fields.map(([label, value]) => `
    <div class="detail-item">
      <span class="detail-label">${escapeHtml(label)}</span>
      <span class="detail-value">${escapeHtml(value || '—')}</span>
    </div>
  `).join('');

  if (branch.address) {
    host.innerHTML += `
      <div class="detail-item full">
        <span class="detail-label">Address</span>
        <span class="detail-value">${escapeHtml(branch.address)}</span>
      </div>`;
  }
}

function renderAccountDetails(session) {
  const host = $('accountGrid');
  if (!host) return;

  const fields = [
    ['Name',      session?.name || '—'],
    ['Email',     session?.email || '—'],
    ['Role',      session?.role || '—'],
    ['Branch ID', session?.branchId || '—'],
  ];

  host.innerHTML = fields.map(([label, value]) => `
    <div class="detail-item">
      <span class="detail-label">${escapeHtml(label)}</span>
      <span class="detail-value">${escapeHtml(value)}</span>
    </div>
  `).join('');
}

async function loadStats(branchId) {
  try {
    const [doctors, frontdesk] = await Promise.all([
      apiRequest('/doctors'),
      apiRequest('/frontdesk'),
    ]);
    const myDoctors  = Array.isArray(doctors)   ? doctors.filter(d => d.branchId === branchId).length   : '—';
    const myFD       = Array.isArray(frontdesk)  ? frontdesk.filter(f => f.branchId === branchId).length : '—';
    setText('statDoctors',  myDoctors);
    setText('statFrontDesk', myFD);
  } catch (_err) {
    // Stats are non-critical, don't block the page
  }
}

async function initDashboard() {
  const session = getSession();
  if (!session || (session.role !== 'branch_admin' && session.role !== 'admin')) {
    window.location.replace('../login.html');
    return;
  }

  // Welcome name
  const name = session.firstName || session.name || 'Admin';
  setText('welcomeName', name.split(' ')[0]);

  renderAccountDetails(session);

  if (!session.branchId) {
    renderBranchDetails(null);
    return;
  }

  // Load stats in background
  loadStats(session.branchId);

  try {
    const branches = await apiRequest('/hospital-branches');
    const branch = Array.isArray(branches)
      ? branches.find(b => b.id === session.branchId) || null
      : null;
    renderBranchDetails(branch);
    if (!branch) showToast('Branch record not found in backend', 'error');
  } catch (err) {
    renderBranchDetails(null);
    showToast(err.message || 'Could not load branch details', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  $('refreshBtn')?.addEventListener('click', async () => {
    showToast('Refreshing…', 'info');
    try { await initDashboard(); } catch (err) { showToast(err.message, 'error'); }
  });
});
