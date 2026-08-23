/* ============================================================
   lab-technicians.js — Branch Admin Lab Technician Management
   FILE: front-end/js/branch-admin/lab-technicians.js
   ============================================================ */

let allTechnicians = [];
let filteredTechnicians = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadComponents('lab-technicians', 'Lab Technicians');
  updateTopbarUser();

  const user = getSession();
  if (user && user.branchId) {
    const branchEl = $('statBranch');
    if (branchEl) branchEl.textContent = user.branchName || user.branchId;
  }

  setupEventListeners();
  await loadTechnicians();
});

function setupEventListeners() {
  const searchInput = $('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      filteredTechnicians = allTechnicians.filter((t) =>
        (t.name || '').toLowerCase().includes(query) ||
        (t.email || '').toLowerCase().includes(query) ||
        (t.id || '').toLowerCase().includes(query)
      );
      renderTable();
    });
  }

  const addBtn = $('addTechnicianBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => openAddModal());
  }
}

async function loadTechnicians() {
  const tbody = $('techniciansBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><p>Loading lab technicians…</p></td></tr>';
  }

  try {
    const data = await apiRequest('/lab-technicians');
    allTechnicians = Array.isArray(data) ? data : [];
    filteredTechnicians = [...allTechnicians];

    updateStats();
    renderTable();
  } catch (error) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><p style="color:var(--red);">${escapeHtml(error.message || 'Failed to load technicians.')}</p></td></tr>`;
    }
    showToast(error.message || 'Could not load lab technicians', 'error');
  }
}

function updateStats() {
  const totalEl = $('statTotal');
  const activeEl = $('statActive');

  if (totalEl) totalEl.textContent = allTechnicians.length;
  if (activeEl) activeEl.textContent = allTechnicians.length;
}

function renderTable() {
  const tbody = $('techniciansBody');
  const countEl = $('resultCount');

  if (countEl) {
    countEl.textContent = `Showing ${filteredTechnicians.length} of ${allTechnicians.length}`;
  }

  if (!tbody) return;

  if (!filteredTechnicians.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><p>No lab technicians found.</p></td></tr>';
    return;
  }

  tbody.innerHTML = filteredTechnicians
    .map((tech) => {
      const initials = getInitials(tech.name);
      const createdStr = tech.createdAt ? formatDate(tech.createdAt.split('T')[0]) : '—';

      return `
        <tr>
          <td>
            <div class="doc-name-cell">
              <div class="doc-avatar lt-avatar">${escapeHtml(initials)}</div>
              <div>
                <div class="font-bold">${escapeHtml(tech.name)}</div>
                <div class="text-muted text-sm">Lab Technician</div>
              </div>
            </div>
          </td>
          <td><span style="font-family:monospace;font-size:12px;color:var(--text-muted);">${escapeHtml(tech.id)}</span></td>
          <td>${escapeHtml(tech.email)}</td>
          <td><span style="font-size:12.5px;color:var(--text-muted);">${escapeHtml(tech.branchId)}</span></td>
          <td><span class="badge badge-active">Active</span></td>
          <td><span style="white-space:nowrap;font-size:12.5px;color:var(--text-muted);">${escapeHtml(createdStr)}</span></td>
        </tr>
      `;
    })
    .join('');
}

function openAddModal() {
  const modalHtml = `
    <div class="modal-header">
      <div class="modal-title">Add Lab Technician</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <form id="addTechnicianForm" onsubmit="event.preventDefault(); submitCreateTechnician();">
        <div class="form-group">
          <label class="form-label required">Full Name</label>
          <input type="text" id="techName" class="form-control" placeholder="e.g. John Doe" required autocomplete="off">
        </div>
        <div class="form-group">
          <label class="form-label required">Email Address</label>
          <input type="email" id="techEmail" class="form-control" placeholder="e.g. johndoe@medbits.com" required autocomplete="off">
        </div>
        <div class="form-group">
          <label class="form-label required">Password</label>
          <input type="password" id="techPassword" class="form-control" placeholder="Minimum 6 characters" required autocomplete="new-password">
          <div class="form-help-text">Choose a secure password for the technician login.</div>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button type="button" class="btn btn-accent" id="submitTechBtn" onclick="submitCreateTechnician()">Create Lab Technician</button>
    </div>
  `;

  openModal(modalHtml);
}

async function submitCreateTechnician() {
  const name = val('techName');
  const email = val('techEmail');
  const password = val('techPassword');

  if (!name) {
    showToast('Name is required', 'warning');
    $('techName')?.focus();
    return;
  }

  if (!email || !validateEmail(email)) {
    showToast('Please enter a valid email address', 'warning');
    $('techEmail')?.focus();
    return;
  }

  if (!password || password.length < 6) {
    showToast('Password must be at least 6 characters', 'warning');
    $('techPassword')?.focus();
    return;
  }

  const submitBtn = $('submitTechBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating…';
  }

  try {
    const created = await apiRequest('/lab-technicians', {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    });

    showToast(`Lab Technician "${created.name}" created successfully.`, 'success');
    closeModal();
    await loadTechnicians();
  } catch (error) {
    showToast(error.message || 'Failed to create lab technician', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Lab Technician';
    }
  }
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getInitials(str) {
  if (!str) return 'LT';
  return str
    .split(/[\s-]+/)
    .map((w) => w[0]?.toUpperCase() || '')
    .slice(0, 2)
    .join('') || 'LT';
}
