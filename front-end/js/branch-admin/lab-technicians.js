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
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><p>Loading lab technicians…</p></td></tr>';
  }

  try {
    const data = await apiRequest('/lab-technicians');
    allTechnicians = Array.isArray(data) ? data : [];
    filteredTechnicians = [...allTechnicians];

    updateStats();
    renderTable();
  } catch (error) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><p style="color:var(--red);">${escapeHtml(error.message || 'Failed to load technicians.')}</p></td></tr>`;
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
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><p>No lab technicians found.</p></td></tr>';
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
          <td>${escapeHtml(tech.email)}</td>
          <td><span class="badge badge-active">Active</span></td>
          <td><span style="white-space:nowrap;font-size:12.5px;color:var(--text-muted);">${escapeHtml(createdStr)}</span></td>
          <td>
            <div class="action-btns">
              <button class="btn-icon" title="View" onclick="openViewModal('${escapeHtml(tech.id)}')">👁</button>
              <button class="btn-icon" title="Edit" onclick="openEditModal('${escapeHtml(tech.id)}')">✏️</button>
              <button class="btn-icon" title="Remove" onclick="deleteTechnician('${escapeHtml(tech.id)}')">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}


function buildModalForm(tech = null) {
  const isEdit = !!tech;
  return `
    <div class="modal-title">${isEdit ? '✏️ Edit Lab Technician' : '➕ Add Lab Technician'}</div>
    <form id="addTechnicianForm" onsubmit="submitTechnicianForm(event)">
      <div class="form-grid">
        <div class="form-group">
          <label for="techName">Full Name *</label>
          <input type="text" id="techName" required placeholder="e.g. John Doe" autocomplete="off" value="${escapeHtml(tech?.name || '')}">
        </div>
        <div class="form-group">
          <label for="techEmail">Email Address *</label>
          <input type="email" id="techEmail" required placeholder="e.g. johndoe@medbits.com" autocomplete="off" value="${escapeHtml(tech?.email || '')}" ${isEdit ? 'disabled title="Email cannot be changed easily"' : ''}>
        </div>
        ${!isEdit ? `
        <div class="form-group">
          <label for="techPassword">Password *</label>
          <input type="password" id="techPassword" required placeholder="Minimum 6 characters" minlength="6" autocomplete="new-password">
        </div>
        <div></div>
        ` : ''}
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-accent" id="submitTechBtn">
          ${isEdit ? '💾 Save Changes' : '➕ Add Lab Technician'}
        </button>
      </div>
    </form>
  `;
}

function openAddModal() {
  currentEditId = null;
  openModal(buildModalForm(null));
}

function openEditModal(techId) {
  const tech = allTechnicians.find(t => t.id === techId);
  if (!tech) {
    showToast('Lab Technician not found', 'error');
    return;
  }
  currentEditId = techId;
  openModal(buildModalForm(tech));
}

function openViewModal(techId) {
  const tech = allTechnicians.find(t => t.id === techId);
  if (!tech) { showToast('Lab Technician not found', 'error'); return; }

  const createdStr = tech.createdAt ? formatDate(tech.createdAt.split('T')[0]) : '—';
  
  openModal(`
    <div class="modal-title">🔬 Lab Technician Profile</div>
    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
      <div class="lt-profile-avatar" style="width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-size: 20px; font-weight: 700;">
        ${escapeHtml(getInitials(tech.name))}
      </div>
      <div>
        <div style="font-family:'Sora',sans-serif;font-size:20px;font-weight:700">${escapeHtml(tech.name || '—')}</div>
        <div class="text-muted">Lab Technician · ${escapeHtml(tech.id)}</div>
      </div>
    </div>
    <div style="height: 1px; background: var(--border); margin-bottom: 24px;"></div>
    <div class="detail-grid">
      ${detailItem('Email', tech.email)}
      ${detailItem('Branch ID', tech.branchId)}
      ${detailItem('Status', 'Active')}
      ${detailItem('Created Date', createdStr)}
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">Close</button>
      <button class="btn btn-accent" onclick="closeModal(); openEditModal('${escapeHtml(techId)}')">Edit</button>
    </div>
  `);
}

function detailItem(label, value) {
  return `
    <div style="display: flex; flex-direction: column; gap: 4px;">
      <span style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">${escapeHtml(label)}</span>
      <span style="font-size: 14.5px; font-weight: 500; color: var(--text);">${escapeHtml(String(value ?? '—'))}</span>
    </div>`;
}

async function submitTechnicianForm(e) {
  e.preventDefault();
  const name = val('techName');
  const email = val('techEmail');
  const password = currentEditId ? null : val('techPassword');

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

  if (!currentEditId && (!password || password.length < 6)) {
    showToast('Password must be at least 6 characters', 'warning');
    $('techPassword')?.focus();
    return;
  }

  const submitBtn = $('submitTechBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';
  }

  try {
    if (currentEditId) {
      await apiRequest('/lab-technicians/' + currentEditId, {
        method: 'PUT',
        body: JSON.stringify({ name, email }),
      });
      showToast('Lab Technician updated successfully.', 'success');
    } else {
      await apiRequest('/lab-technicians', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      showToast('Lab Technician created successfully.', 'success');
    }
    
    closeModal();
    await loadTechnicians();
  } catch (error) {
    showToast(error.message || 'Operation failed', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = currentEditId ? 'Save Changes' : 'Create Lab Technician';
    }
  }
}

function deleteTechnician(techId) {
  confirmAction(
    'Remove Lab Technician',
    'Are you sure you want to remove this lab technician?',
    'Remove Technician',
    async () => {
      try {
        await apiRequest('/lab-technicians/' + techId, { method: 'DELETE' });
        showToast('Lab Technician removed successfully', 'success');
        await loadTechnicians();
      } catch (err) {
        showToast(err.message || 'Failed to remove lab technician', 'error');
      }
    }
  );
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

function handleOverlayClick(e) {
  if (e.target.id === 'modalOverlay') closeModal();
}
