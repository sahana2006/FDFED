/* ============================================================
   doctors.js — Branch Admin: Doctor CRUD
   FILE: front-end/js/branch-admin/doctors.js
   ============================================================ */

let allDoctors = [];   // raw data from backend
let filtered   = [];   // after search/filter

// ── INIT ───────────────────────────────────────────────────
async function initDoctorsPage() {
  const session = getSession();
  if (!session || (session.role !== 'branch_admin' && session.role !== 'admin')) {
    window.location.replace('../login.html');
    return;
  }

  await fetchDoctors();
  bindPageEvents();
}

// ── FETCH ──────────────────────────────────────────────────
async function fetchDoctors() {
  try {
    const data = await apiRequest('/doctors');
    // Backend auto-scopes by branchId when role=branch_admin + x-user-id are sent
    allDoctors = Array.isArray(data) ? data : [];
    renderStats();
    populateDeptFilter();
    applyFilters();
  } catch (err) {
    allDoctors = [];
    renderTable([]);
    showToast(err.message || 'Failed to load doctors', 'error');
  }
}

// ── STATS ──────────────────────────────────────────────────
function renderStats() {
  setText('statTotal', allDoctors.length);

  const specs = new Set(allDoctors.map(d => d.specialization).filter(Boolean));
  setText('statSpecs', specs.size);

  const exps = allDoctors.map(d => Number(d.experience)).filter(n => !isNaN(n) && n > 0);
  const avgExp = exps.length
    ? (exps.reduce((a, b) => a + b, 0) / exps.length).toFixed(1)
    : '—';
  setText('statExp', avgExp);
}

// ── FILTER ─────────────────────────────────────────────────
function populateDeptFilter() {
  const select = $('filterDept');
  if (!select) return;
  const depts = [...new Set(allDoctors.map(d => d.department).filter(Boolean))].sort();
  select.innerHTML = '<option value="">All Departments</option>'
    + depts.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
}

function applyFilters() {
  const query = ($('searchInput')?.value || '').toLowerCase();
  const dept  = $('filterDept')?.value || '';

  filtered = allDoctors.filter(d => {
    const matchSearch = !query
      || (d.name || '').toLowerCase().includes(query)
      || (d.specialization || '').toLowerCase().includes(query);
    const matchDept = !dept || d.department === dept;
    return matchSearch && matchDept;
  });

  setText('resultCount', `${filtered.length} of ${allDoctors.length} doctors`);
  renderTable(filtered);
}

// ── TABLE ──────────────────────────────────────────────────
function renderTable(doctors) {
  const tbody = $('doctorsBody');
  if (!tbody) return;

  if (!doctors.length) {
    tbody.innerHTML = `
      <tr><td colspan="8">
        <div class="empty-state">
          <div class="empty-icon">🩺</div>
          <p>No doctors found. Add one to get started.</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = doctors.map(doc => `
    <tr>
      <td>
        <div class="doc-name-cell" style="cursor: pointer;" onclick="openViewModal('${escapeHtml(doc.id || doc.userId || '')}')" title="Click to view full doctor details & appointments">
          <div class="doc-avatar">${doctorInitials(doc.name)}</div>
          <div>
            <div style="font-weight:600; color:var(--navy);" class="doc-name-link">${escapeHtml(doc.name || '—')}</div>
            <div class="text-muted text-sm">${escapeHtml(doc.email || '')}</div>
          </div>
        </div>
      </td>
      <td><span class="badge badge-teal">${escapeHtml(doc.specialization || '—')}</span></td>
      <td>${escapeHtml(doc.department || '—')}</td>
      <td>${doc.experience != null ? `${doc.experience} yrs` : '—'}</td>
      <td>${doc.consultationFee != null && doc.consultationFee > 0 ? `₹${doc.consultationFee}` : '—'}</td>
      <td>${doc.percentageCut != null && doc.percentageCut > 0 ? `${doc.percentageCut}%` : '—'}</td>
      <td>${escapeHtml(doc.phone || '—')}</td>
      <td>
        <div class="action-btns">
          <button class="action-view-btn" title="View Full Details & Appointments" onclick="openViewModal('${escapeHtml(doc.id || doc.userId || '')}')">👁 View</button>
          <button class="btn-icon" title="Edit" onclick="openEditModal('${escapeHtml(doc.id || doc.userId || '')}')">✏️</button>
          <button class="btn-icon" title="Remove" onclick="deleteDoctor('${escapeHtml(doc.id || doc.userId || '')}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function doctorInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.map(p => p[0].toUpperCase()).slice(0, 2).join('');
}

// ── VIEW MODAL ─────────────────────────────────────────────
async function openViewModal(doctorId) {
  const doc = findDoctor(doctorId);
  if (!doc) { showToast('Doctor not found', 'error'); return; }

  openModal(`
    <div class="modal-title">🩺 Doctor Profile & Appointments</div>
    <div class="doc-profile-header">
      <div class="doc-profile-avatar">${doctorInitials(doc.name)}</div>
      <div>
        <div style="font-family:'Sora',sans-serif;font-size:20px;font-weight:700">${escapeHtml(doc.name || '—')}</div>
        <div class="text-muted">${escapeHtml(doc.specialization || '')} ${doc.department ? '· ' + doc.department : ''} · <span class="badge badge-teal">${escapeHtml(doc.id || doc.userId || '')}</span></div>
      </div>
    </div>
    
    <div class="divider"></div>
    <div style="font-weight:700; font-size:14px; margin-bottom:12px; color:var(--navy);">Personal & Professional Information</div>
    <div class="detail-grid">
      ${detailItem('Email',            doc.email)}
      ${detailItem('Phone',            doc.phone)}
      ${detailItem('Gender',           doc.gender)}
      ${detailItem('Age',              doc.age)}
      ${detailItem('Qualification',    doc.qualification)}
      ${detailItem('Experience',       doc.experience != null ? doc.experience + ' years' : null)}
      ${detailItem('Consultation Fee', doc.consultationFee != null ? '₹' + doc.consultationFee : null)}
      ${detailItem('Doctor Cut (%)',   doc.percentageCut != null ? doc.percentageCut + '%' : null)}
      ${detailItem('License No.',      doc.licenseNo)}
      ${detailItem('Branch ID',        doc.branchId)}
      ${doc.bio ? `<div class="detail-item full">${detailItem('Bio', doc.bio)}</div>` : ''}
      ${doc.slots?.length ? `<div class="detail-item full">${detailItem('Available Slots', doc.slots.join(', '))}</div>` : ''}
    </div>

    <div class="divider"></div>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
      <div style="font-weight:700; font-size:14px; color:var(--navy);">Appointments Overview</div>
      <div id="docApptSummaryPills" style="display:flex; gap:6px; flex-wrap:wrap;"></div>
    </div>
    <div id="docApptListWrap" style="max-height: 220px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 4px;">
      <p style="text-align:center; color:var(--text-muted); font-size:13px; padding:16px;">Loading appointments...</p>
    </div>

    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">Close</button>
      <button class="btn btn-accent" onclick="closeModal(); openEditModal('${escapeHtml(doctorId)}')">Edit Doctor</button>
    </div>
  `);

  try {
    const appts = await apiRequest(`/appointments/doctor/${encodeURIComponent(doc.userId || doc.id || doctorId)}`);
    renderDoctorAppointmentsInModal(Array.isArray(appts) ? appts : []);
  } catch (err) {
    const listWrap = $('docApptListWrap');
    if (listWrap) {
      listWrap.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:13px; padding:16px;">No appointments found for this doctor.</p>`;
    }
  }
}

function renderDoctorAppointmentsInModal(appointments) {
  const pillsEl = $('docApptSummaryPills');
  const listEl = $('docApptListWrap');
  if (!listEl) return;

  const total = appointments.length;
  const completed = appointments.filter(a => {
    const s = String(a.status || '').toLowerCase();
    return s === 'completed' || s === 'done';
  });
  const pending = appointments.filter(a => String(a.status || '').toLowerCase() === 'pending');
  const accepted = appointments.filter(a => String(a.status || '').toLowerCase() === 'accepted');
  const upcoming = appointments.filter(a => String(a.status || '').toLowerCase() === 'upcoming');
  const rejected = appointments.filter(a => {
    const s = String(a.status || '').toLowerCase();
    return s === 'rejected' || s === 'cancelled';
  });

  if (pillsEl) {
    pillsEl.innerHTML = `
      <span class="badge badge-teal" style="font-size:11px;">Total: ${total}</span>
      ${completed.length ? `<span class="badge badge-green" style="font-size:11px;">Completed: ${completed.length}</span>` : ''}
      ${pending.length ? `<span class="badge badge-orange" style="font-size:11px;">Pending: ${pending.length}</span>` : ''}
      ${accepted.length ? `<span class="badge badge-teal" style="font-size:11px;">Accepted: ${accepted.length}</span>` : ''}
      ${upcoming.length ? `<span class="badge badge-blue" style="font-size:11px;">Upcoming: ${upcoming.length}</span>` : ''}
      ${rejected.length ? `<span class="badge badge-red" style="font-size:11px;">Rejected/Cancelled: ${rejected.length}</span>` : ''}
    `;
  }

  if (!appointments.length) {
    listEl.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:13px; padding:16px;">No appointments scheduled for this doctor.</p>';
    return;
  }

  listEl.innerHTML = `
    <table style="width:100%; font-size:12.5px; border-collapse:collapse;">
      <thead>
        <tr style="background:var(--bg); text-align:left;">
          <th style="padding:6px 10px; font-size:11px;">Date & Time</th>
          <th style="padding:6px 10px; font-size:11px;">Patient</th>
          <th style="padding:6px 10px; font-size:11px;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${appointments.map(a => {
          const patientName = a.patient?.name || a.userId || 'Patient';
          const patientPhone = a.patient?.phone || '';
          let badgeClass = 'badge-teal';
          const st = String(a.status || 'upcoming').toLowerCase();
          let statusLabel = 'Upcoming';
          if (st === 'completed' || st === 'done') {
            badgeClass = 'badge-green';
            statusLabel = 'Completed';
          } else if (st === 'pending') {
            badgeClass = 'badge-orange';
            statusLabel = 'Pending';
          } else if (st === 'accepted') {
            badgeClass = 'badge-teal';
            statusLabel = 'Accepted';
          } else if (st === 'rejected') {
            badgeClass = 'badge-red';
            statusLabel = 'Rejected';
          } else if (st === 'cancelled') {
            badgeClass = 'badge-red';
            statusLabel = 'Cancelled';
          } else if (st === 'upcoming') {
            badgeClass = 'badge-blue';
            statusLabel = 'Upcoming';
          } else {
            statusLabel = st.charAt(0).toUpperCase() + st.slice(1);
          }

          return `
            <tr style="border-bottom:1px solid var(--border);">
              <td style="padding:8px 10px;">
                <div style="font-weight:600;">${escapeHtml(formatDate(a.date))}</div>
                <div class="text-muted" style="font-size:11.5px;">${escapeHtml(a.slot || '—')}</div>
              </td>
              <td style="padding:8px 10px;">
                <div style="font-weight:600;">${escapeHtml(patientName)}</div>
                ${patientPhone ? `<div class="text-muted" style="font-size:11px;">${escapeHtml(patientPhone)}</div>` : ''}
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
    <div class="detail-item">
      <span class="detail-label">${escapeHtml(label)}</span>
      <span class="detail-value">${escapeHtml(String(value ?? '—'))}</span>
    </div>`;
}

// ── ADD MODAL ──────────────────────────────────────────────
function openAddModal() {
  currentEditId = null;
  openModal(buildDoctorForm(null));
  setupSlotTags();
}

// ── EDIT MODAL ─────────────────────────────────────────────
function openEditModal(doctorId) {
  const doc = findDoctor(doctorId);
  if (!doc) { showToast('Doctor not found', 'error'); return; }
  currentEditId = doc.id || doc.userId || doctorId;
  openModal(buildDoctorForm(doc));
  setupSlotTags(doc.slots || []);
}

// ── FORM BUILDER ───────────────────────────────────────────
function buildDoctorForm(doc) {
  const isEdit = !!doc;
  const session = getSession();
  return `
    <div class="modal-title">${isEdit ? '✏️ Edit Doctor' : '➕ Add Doctor'}</div>
    <form id="doctorForm" onsubmit="submitDoctorForm(event)">
      <div class="form-grid">
        <div class="form-group">
          <label for="df-name">Full Name *</label>
          <input id="df-name" type="text" required placeholder="Dr. Jane Smith" value="${escapeHtml(doc?.name || '')}">
        </div>
        <div class="form-group">
          <label for="df-email">Email *</label>
          <input id="df-email" type="email" required pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$" title="Valid email address" placeholder="doctor@medbits.com" value="${escapeHtml(doc?.email || '')}" ${isEdit ? 'disabled title="Email cannot be changed"' : ''}>
        </div>
        ${!isEdit ? `
        <div class="form-group">
          <label for="df-password">Password *</label>
          <input id="df-password" type="password" required placeholder="Min. 6 characters" minlength="6">
        </div>` : '<div></div>'}
        <div class="form-group">
          <label for="df-specialization">Specialization *</label>
          <input id="df-specialization" type="text" required placeholder="e.g. Cardiology" value="${escapeHtml(doc?.specialization || '')}">
        </div>
        <div class="form-group">
          <label for="df-department">Department</label>
          <input id="df-department" type="text" placeholder="e.g. Cardiology Dept" value="${escapeHtml(doc?.department || '')}">
        </div>
        <div class="form-group">
          <label for="df-qualification">Qualification</label>
          <input id="df-qualification" type="text" placeholder="e.g. MBBS, MD" value="${escapeHtml(doc?.qualification || '')}">
        </div>
        <div class="form-group">
          <label for="df-experience">Experience (years)</label>
          <input id="df-experience" type="number" min="0" max="60" placeholder="10" value="${doc?.experience ?? ''}">
        </div>
        <div class="form-group">
          <label for="df-fee">Consultation Fee (₹)</label>
          <input id="df-fee" type="number" min="0" step="1" placeholder="e.g. 500" value="${doc?.consultationFee ?? ''}">
        </div>
        <div class="form-group">
          <label for="df-cut">Doctor Cut (%)</label>
          <input id="df-cut" type="number" min="0" max="100" step="0.1" placeholder="e.g. 70" value="${doc?.percentageCut ?? ''}">
        </div>
        <div class="form-group">
          <label for="df-age">Age</label>
          <input id="df-age" type="number" min="20" max="90" placeholder="35" value="${doc?.age ?? ''}">
        </div>
        <div class="form-group">
          <label for="df-gender">Gender</label>
          <select id="df-gender">
            <option value="">— Select —</option>
            <option value="Male"   ${doc?.gender === 'Male'   ? 'selected' : ''}>Male</option>
            <option value="Female" ${doc?.gender === 'Female' ? 'selected' : ''}>Female</option>
            <option value="Other"  ${doc?.gender === 'Other'  ? 'selected' : ''}>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label for="df-phone">Phone</label>
          <input id="df-phone" type="tel" pattern="\\d{10}" title="10 digit phone number" placeholder="9876543210" value="${escapeHtml(doc?.phone || '')}">
        </div>
        <div class="form-group">
          <label for="df-license">License No.</label>
          <input id="df-license" type="text" placeholder="LIC12345" value="${escapeHtml(doc?.licenseNo || '')}">
        </div>
        <div class="form-group full">
          <label for="df-bio">Bio</label>
          <textarea id="df-bio" placeholder="Brief doctor bio…">${escapeHtml(doc?.bio || '')}</textarea>
        </div>
        <div class="form-group full">
          <label>Available Slots</label>
          <div class="slot-tags-wrap" id="slotTagsWrap">
            <div id="slotTags" class="slot-tags"></div>
            <div style="display: flex; gap: 10px; align-items: center; margin-top: 8px;">
              <input id="slotStart" type="time" class="slot-input" style="width: auto;">
              <button type="button" class="btn btn-outline btn-sm" id="addSlotBtn">Add</button>
            </div>
          </div>
          <input type="hidden" id="df-slots" value="${escapeHtml(JSON.stringify(doc?.slots || []))}">
        </div>
        <div class="form-group full">
          <input type="hidden" id="df-branchId" value="${escapeHtml(session?.branchId || doc?.branchId || '')}">
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-accent" id="doctorSubmitBtn">
          ${isEdit ? '💾 Save Changes' : '➕ Add Doctor'}
        </button>
      </div>
    </form>
  `;
}

// ── SLOT TAG INPUT ─────────────────────────────────────────
function setupSlotTags(existing = []) {
  const tagsContainer = $('slotTags');
  const addBtn        = $('addSlotBtn');
  const hidden        = $('df-slots');
  if (!tagsContainer || !addBtn || !hidden) return;

  let slots = [...existing];

  function render() {
    tagsContainer.innerHTML = slots.map((s, i) => `
      <span class="slot-tag">
        ${escapeHtml(s)}
        <button type="button" class="slot-tag-remove" onclick="removeSlot(${i})">×</button>
      </span>
    `).join('');
    hidden.value = JSON.stringify(slots);
  }

  window.removeSlot = function(i) {
    slots.splice(i, 1);
    render();
  };

  function formatTime(time24) {
    let [h, m] = time24.split(':');
    let hours = parseInt(h, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, '0')}:${m} ${ampm}`;
  }

  addBtn.addEventListener('click', () => {
    const start = $('slotStart').value;
    if (!start) {
      showToast('Please select a time', 'error');
      return;
    }
    const formattedSlot = formatTime(start);
    if (!slots.includes(formattedSlot)) {
      slots.push(formattedSlot);
      render();
    }
    $('slotStart').value = '';
  });

  render();
}

// ── SUBMIT ─────────────────────────────────────────────────
async function submitDoctorForm(e) {
  e.preventDefault();
  const btn = $('doctorSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

  try {
    const slots = JSON.parse($('df-slots')?.value || '[]');
    const body  = {
      name:           val('df-name'),
      email:          val('df-email'),
      specialization: val('df-specialization'),
      branchId:       val('df-branchId'),
      department:     val('df-department') || undefined,
      qualification:  val('df-qualification') || undefined,
      gender:         val('df-gender') || undefined,
      phone:          val('df-phone') || undefined,
      licenseNo:      val('df-license') || undefined,
      bio:            val('df-bio') || undefined,
      slots,
    };

    const exp = val('df-experience');
    if (exp !== '') body.experience = Number(exp);

    const age = val('df-age');
    if (age !== '') body.age = Number(age);

    const fee = val('df-fee');
    if (fee !== '') body.consultationFee = Number(fee);

    const cut = val('df-cut');
    if (cut !== '') body.percentageCut = Number(cut);

    if (currentEditId) {
      // UPDATE
      await apiRequest(`/doctors/${currentEditId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      showToast('Doctor updated successfully!', 'success');
    } else {
      // CREATE
      body.password = val('df-password');
      await apiRequest('/doctors', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      showToast('Doctor added successfully!', 'success');
    }

    closeModal();
    await fetchDoctors();
  } catch (err) {
    showToast(err.message || 'Operation failed', 'error');
    if (btn) { btn.disabled = false; btn.textContent = currentEditId ? '💾 Save Changes' : '➕ Add Doctor'; }
  }
}

// ── DELETE ─────────────────────────────────────────────────
function deleteDoctor(doctorId) {
  confirmAction(
    'Remove Doctor',
    'Are you sure you want to remove this doctor from the branch? Historical records will be kept.',
    'Remove Doctor',
    async () => {
      try {
        await apiRequest(`/doctors/${doctorId}`, { method: 'DELETE' });
        showToast('Doctor removed successfully', 'success');
        await fetchDoctors();
      } catch (err) {
        showToast(err.message || 'Failed to remove doctor', 'error');
      }
    }
  );
}

// ── HELPERS ────────────────────────────────────────────────
function findDoctor(id) {
  return allDoctors.find(d => (d.id || d.userId) === id) || null;
}

function handleOverlayClick(e) {
  if (e.target === $('modalOverlay')) closeModal();
}

// ── BIND EVENTS ────────────────────────────────────────────
function bindPageEvents() {
  $('addDoctorBtn')?.addEventListener('click', openAddModal);
  $('searchInput')?.addEventListener('input', applyFilters);
  $('filterDept')?.addEventListener('change', applyFilters);
}
