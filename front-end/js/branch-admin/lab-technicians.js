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
            <div class="doc-name-cell" style="cursor: pointer;" onclick="openViewModal('${escapeHtml(tech.id)}')" title="Click to view technician details & lab activity">
              <div class="doc-avatar lt-avatar">${escapeHtml(initials)}</div>
              <div>
                <div class="font-bold doc-name-link" style="color:var(--navy);">${escapeHtml(tech.name)}</div>
                <div class="text-muted text-sm">${escapeHtml(tech.email || 'Lab Technician')}</div>
              </div>
            </div>
          </td>
          <td>${escapeHtml(tech.email)}</td>
          <td><span class="badge badge-active">Active</span></td>
          <td><span style="white-space:nowrap;font-size:12.5px;color:var(--text-muted);">${escapeHtml(createdStr)}</span></td>
          <td>
            <div class="action-btns">
              <button class="action-view-btn" title="View Full Details & Lab Activity" onclick="openViewModal('${escapeHtml(tech.id)}')">👁 View</button>
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

async function openViewModal(techId) {
  const tech = allTechnicians.find(t => t.id === techId);
  if (!tech) { showToast('Lab Technician not found', 'error'); return; }

  const createdStr = tech.createdAt ? formatDate(tech.createdAt.split('T')[0]) : '—';
  
  openModal(`
    <div class="modal-title">🔬 Lab Technician Profile & Managed Appointments</div>
    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
      <div class="lt-profile-avatar" style="width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-size: 20px; font-weight: 700; background: var(--navy);">
        ${escapeHtml(getInitials(tech.name))}
      </div>
      <div>
        <div style="font-family:'Sora',sans-serif;font-size:20px;font-weight:700">${escapeHtml(tech.name || '—')}</div>
        <div class="text-muted">Lab Technician · <span class="badge badge-teal">${escapeHtml(tech.id)}</span></div>
      </div>
    </div>
    
    <div class="divider"></div>
    <div style="font-weight:700; font-size:14px; margin-bottom:12px; color:var(--navy);">Technician Details</div>
    <div class="detail-grid">
      ${detailItem('Email', tech.email)}
      ${detailItem('Technician ID', tech.id)}
      ${detailItem('Branch ID', tech.branchId)}
      ${detailItem('Status', 'Active')}
      ${detailItem('Created Date', createdStr)}
    </div>

    <div class="divider"></div>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
      <div style="font-weight:700; font-size:14px; color:var(--navy);">Lab Technician Managed Appointments & Tests</div>
      <div id="ltSummaryPills" style="display:flex; gap:6px; flex-wrap:wrap;"></div>
    </div>
    <div id="ltListWrap" style="max-height: 240px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 4px;">
      <p style="text-align:center; color:var(--text-muted); font-size:13px; padding:16px;">Loading managed appointments...</p>
    </div>

    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">Close</button>
      <button class="btn btn-accent" onclick="closeModal(); openEditModal('${escapeHtml(techId)}')">Edit Technician</button>
    </div>
  `);

  try {
    const [requestsRes, reportsRes] = await Promise.all([
      apiRequest('/lab-requests').catch(() => []),
      apiRequest('/lab-reports').catch(() => []),
    ]);

    const allRequests = Array.isArray(requestsRes) ? requestsRes : [];
    const allReports = Array.isArray(reportsRes) ? reportsRes : [];

    // Filter requests managed by this technician
    const techRequests = allRequests.filter(r => {
      if (r.acceptedByTechnicianId && r.acceptedByTechnicianId === techId) return true;
      if (r.rejectedByTechnicianId && r.rejectedByTechnicianId === techId) return true;
      if (r.technicianId && r.technicianId === techId) return true;
      if (r.reportId && allReports.some(rep => rep.id === r.reportId && rep.technicianId === techId)) return true;
      if (!r.acceptedByTechnicianId && r.branchId === tech.branchId) return true;
      return false;
    });

    renderTechReportsInModal(techRequests, allReports);
  } catch (err) {
    const listWrap = $('ltListWrap');
    if (listWrap) {
      listWrap.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:13px; padding:16px;">No lab technician managed appointments found for this technician.</p>`;
    }
  }
}

function renderTechReportsInModal(requests, reports) {
  const pillsEl = $('ltSummaryPills');
  const listEl = $('ltListWrap');
  if (!listEl) return;

  const total = requests.length;
  const completed = requests.filter(r => r.status === 'completed' || r.status === 'submitted' || r.status === 'done');
  const inProgress = requests.filter(r => r.status === 'in_progress' || r.status === 'accepted' || r.status === 'draft_report');
  const pending = requests.filter(r => r.status === 'pending');
  const rejected = requests.filter(r => r.status === 'rejected');

  if (pillsEl) {
    pillsEl.innerHTML = `
      <span class="badge badge-teal" style="font-size:11px;">Total: ${total}</span>
      ${completed.length ? `<span class="badge badge-green" style="font-size:11px;">Completed: ${completed.length}</span>` : ''}
      ${inProgress.length ? `<span class="badge badge-blue" style="font-size:11px;">In Progress: ${inProgress.length}</span>` : ''}
      ${pending.length ? `<span class="badge badge-orange" style="font-size:11px;">Pending: ${pending.length}</span>` : ''}
      ${rejected.length ? `<span class="badge badge-red" style="font-size:11px;">Rejected: ${rejected.length}</span>` : ''}
    `;
  }

  if (!requests.length) {
    listEl.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:13px; padding:16px;">No lab technician managed appointments found for this technician.</p>';
    return;
  }

  listEl.innerHTML = `
    <table style="width:100%; font-size:12.5px; border-collapse:collapse;">
      <thead>
        <tr style="background:var(--bg); text-align:left;">
          <th style="padding:6px 10px; font-size:11px;">Appt / Request</th>
          <th style="padding:6px 10px; font-size:11px;">Patient</th>
          <th style="padding:6px 10px; font-size:11px;">Doctor & Test</th>
          <th style="padding:6px 10px; font-size:11px;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${requests.map(r => {
          const apptId = r.appointmentId ? `Appt: ${r.appointmentId}` : r.id;
          const patientName = r.patientName || r.patientId || 'Patient';
          const doctorName = r.doctorName || r.doctorId || 'Doctor';
          const testName = r.testName || 'Lab Test';
          const dateStr = formatDate(r.labTestDate || r.requestDate || r.createdAt?.split('T')[0] || '');
          
          let badgeClass = 'badge-orange';
          let statusLabel = 'Pending';
          const st = String(r.status || '').toLowerCase();
          if (st === 'completed' || st === 'submitted' || st === 'done') {
            badgeClass = 'badge-green';
            statusLabel = 'Completed';
          } else if (st === 'in_progress' || st === 'accepted') {
            badgeClass = 'badge-blue';
            statusLabel = 'In Progress';
          } else if (st === 'draft_report') {
            badgeClass = 'badge-teal';
            statusLabel = 'Draft Report';
          } else if (st === 'rejected') {
            badgeClass = 'badge-red';
            statusLabel = 'Rejected';
          } else if (st === 'pending') {
            badgeClass = 'badge-orange';
            statusLabel = 'Pending';
          } else {
            statusLabel = st ? st.charAt(0).toUpperCase() + st.slice(1) : 'Pending';
          }

          return `
            <tr style="border-bottom:1px solid var(--border);">
              <td style="padding:8px 10px;">
                <div style="font-weight:600; color:var(--navy);">${escapeHtml(apptId)}</div>
                <div class="text-muted" style="font-size:11.5px;">${escapeHtml(dateStr)}</div>
              </td>
              <td style="padding:8px 10px;">
                <div style="font-weight:600;">${escapeHtml(patientName)}</div>
                <div class="text-muted" style="font-size:11px;">ID: ${escapeHtml(r.patientId || '—')}</div>
              </td>
              <td style="padding:8px 10px;">
                <div style="font-weight:500;">${escapeHtml(testName)}</div>
                <div class="text-muted" style="font-size:11px;">Dr: ${escapeHtml(doctorName)}</div>
              </td>
              <td style="padding:8px 10px;">
                <span class="badge ${badgeClass}" style="font-size:11px;">${escapeHtml(statusLabel)}</span>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
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
