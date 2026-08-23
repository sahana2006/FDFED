/* ============================================================
   frontdesk.js — Branch Admin: Front Desk Staff CRUD
   FILE: front-end/js/branch-admin/frontdesk.js
   ============================================================ */

let allStaff = [];
let filteredFD = [];

// ── INIT ───────────────────────────────────────────────────
async function initFrontDeskPage() {
  const session = getSession();
  if (!session || (session.role !== 'branch_admin' && session.role !== 'admin')) {
    window.location.replace('../login.html');
    return;
  }

  await fetchFrontDesk();
  bindFDEvents();
}

// ── FETCH ──────────────────────────────────────────────────
async function fetchFrontDesk() {
  try {
    const data = await apiRequest('/frontdesk');
    // Backend auto-scopes by branchId when role=branch_admin + x-user-id are sent
    allStaff = Array.isArray(data) ? data : [];
    renderFDStats();
    applyFDFilters();
  } catch (err) {
    allStaff = [];
    renderFDTable([]);
    showToast(err.message || 'Failed to load front desk staff', 'error');
  }
}

// ── STATS ──────────────────────────────────────────────────
function renderFDStats() {
  setText('statTotal', allStaff.length);

  const counters = new Set(allStaff.map(f => f.counter).filter(Boolean));
  setText('statCounters', counters.size);

  const langs = new Set(allStaff.flatMap(f => f.languages || []).filter(Boolean));
  setText('statLangs', langs.size);
}

// ── FILTER ─────────────────────────────────────────────────
function applyFDFilters() {
  const query  = ($('searchInput')?.value || '').toLowerCase();
  const gender = $('filterGender')?.value || '';

  filteredFD = allStaff.filter(f => {
    const matchSearch = !query
      || (f.name    || '').toLowerCase().includes(query)
      || (f.counter || '').toLowerCase().includes(query);
    const matchGender = !gender || f.gender === gender;
    return matchSearch && matchGender;
  });

  setText('resultCount', `${filteredFD.length} of ${allStaff.length} staff`);
  renderFDTable(filteredFD);
}

// ── TABLE ──────────────────────────────────────────────────
function renderFDTable(staff) {
  const tbody = $('fdBody');
  if (!tbody) return;

  if (!staff.length) {
    tbody.innerHTML = `
      <tr><td colspan="7">
        <div class="empty-state">
          <div class="empty-icon">🖥️</div>
          <p>No front desk staff found. Add one to get started.</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = staff.map(fd => {
    const shift = (fd.shiftStart && fd.shiftEnd) ? `${fd.shiftStart} – ${fd.shiftEnd}` : '—';
    const langs = Array.isArray(fd.languages) && fd.languages.length
      ? fd.languages.map(l => `<span class="badge badge-blue">${escapeHtml(l)}</span>`).join(' ')
      : '—';
    return `
      <tr>
        <td>
          <div class="doc-name-cell">
            <div class="doc-avatar fd-avatar">${staffInitials(fd.name)}</div>
            <div>
              <div style="font-weight:600">${escapeHtml(fd.name || '—')}</div>
              <div class="text-muted text-sm">${escapeHtml(fd.email || '')}</div>
            </div>
          </div>
        </td>
        <td>${escapeHtml(fd.counter || '—')}</td>
        <td>${escapeHtml(shift)}</td>
        <td>${escapeHtml(fd.phone || '—')}</td>
        <td>${escapeHtml(fd.gender || '—')}</td>
        <td>${langs}</td>
        <td>
          <div class="action-btns">
            <button class="btn-icon" title="View" onclick="openFDViewModal('${escapeHtml(fd.userId || fd.id || '')}')">👁</button>
            <button class="btn-icon" title="Edit" onclick="openFDEditModal('${escapeHtml(fd.userId || fd.id || '')}')">✏️</button>
            <button class="btn-icon" title="Remove" onclick="deleteFrontdesk('${escapeHtml(fd.userId || fd.id || '')}')">🗑️</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function staffInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).filter(Boolean).map(p => p[0].toUpperCase()).slice(0, 2).join('');
}

// ── VIEW MODAL ─────────────────────────────────────────────
function openFDViewModal(staffId) {
  const fd = findStaff(staffId);
  if (!fd) { showToast('Staff member not found', 'error'); return; }

  const langs = Array.isArray(fd.languages) && fd.languages.length
    ? fd.languages.join(', ') : '—';
  const shift = (fd.shiftStart && fd.shiftEnd) ? `${fd.shiftStart} – ${fd.shiftEnd}` : '—';

  openModal(`
    <div class="modal-title">🖥️ Front Desk Profile</div>
    <div class="doc-profile-header">
      <div class="doc-profile-avatar fd-avatar">${staffInitials(fd.name)}</div>
      <div>
        <div style="font-family:'Sora',sans-serif;font-size:20px;font-weight:700">${escapeHtml(fd.name || '—')}</div>
        <div class="text-muted">${escapeHtml(fd.counter || 'Front Desk')} ${fd.gender ? '· ' + fd.gender : ''}</div>
      </div>
    </div>
    <div class="divider"></div>
    <div class="detail-grid">
      ${fdDetailItem('Email',              fd.email)}
      ${fdDetailItem('Phone',              fd.phone)}
      ${fdDetailItem('Gender',             fd.gender)}
      ${fdDetailItem('Counter',            fd.counter)}
      ${fdDetailItem('Shift',              shift)}
      ${fdDetailItem('Reporting Manager',  fd.reportingManagerId)}
      ${fdDetailItem('Branch ID',          fd.branchId)}
      <div class="detail-item full">
        <span class="detail-label">Languages</span>
        <span class="detail-value">${escapeHtml(langs)}</span>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">Close</button>
      <button class="btn btn-accent" onclick="closeModal(); openFDEditModal('${escapeHtml(staffId)}')">Edit</button>
    </div>
  `);
}

function fdDetailItem(label, value) {
  return `
    <div class="detail-item">
      <span class="detail-label">${escapeHtml(label)}</span>
      <span class="detail-value">${escapeHtml(String(value ?? '—'))}</span>
    </div>`;
}

// ── ADD MODAL ──────────────────────────────────────────────
function openFDAddModal() {
  currentEditId = null;
  openModal(buildFDForm(null));
  setupLangTags();
}

// ── EDIT MODAL ─────────────────────────────────────────────
function openFDEditModal(staffId) {
  const fd = findStaff(staffId);
  if (!fd) { showToast('Staff member not found', 'error'); return; }
  currentEditId = fd.userId || fd.id || staffId;
  openModal(buildFDForm(fd));
  setupLangTags(fd.languages || []);
}

// ── FORM BUILDER ───────────────────────────────────────────
function buildFDForm(fd) {
  const isEdit  = !!fd;
  const session = getSession();
  return `
    <div class="modal-title">${isEdit ? '✏️ Edit Front Desk Staff' : '➕ Add Front Desk Staff'}</div>
    <form id="fdForm" onsubmit="submitFDForm(event)">
      <div class="form-grid">
        <div class="form-group">
          <label for="fd-name">Full Name *</label>
          <input id="fd-name" type="text" required placeholder="Alice Smith" value="${escapeHtml(fd?.name || '')}">
        </div>
        <div class="form-group">
          <label for="fd-email">Email *</label>
          <input id="fd-email" type="email" required pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$" title="Valid email address" placeholder="staff@medbits.com" value="${escapeHtml(fd?.email || '')}" ${isEdit ? 'disabled title="Email cannot be changed"' : ''}>
        </div>
        ${!isEdit ? `
        <div class="form-group">
          <label for="fd-password">Password *</label>
          <input id="fd-password" type="password" required placeholder="Min. 6 characters" minlength="6">
        </div>` : '<div></div>'}
        <div class="form-group">
          <label for="fd-phone">Phone</label>
          <input id="fd-phone" type="tel" pattern="\\d{10}" title="10 digit phone number" placeholder="9876543210" value="${escapeHtml(fd?.phone || '')}">
        </div>
        <div class="form-group">
          <label for="fd-gender">Gender</label>
          <select id="fd-gender">
            <option value="">— Select —</option>
            <option value="Male"   ${fd?.gender === 'Male'   ? 'selected' : ''}>Male</option>
            <option value="Female" ${fd?.gender === 'Female' ? 'selected' : ''}>Female</option>
            <option value="Other"  ${fd?.gender === 'Other'  ? 'selected' : ''}>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label for="fd-counter">Counter</label>
          <input id="fd-counter" type="text" placeholder="Counter 1" value="${escapeHtml(fd?.counter || '')}">
        </div>
        <div class="form-group">
          <label for="fd-shiftStart">Shift Start</label>
          <input id="fd-shiftStart" type="time" value="${parseTime24(fd?.shiftStart || '')}">
        </div>
        <div class="form-group">
          <label for="fd-shiftEnd">Shift End</label>
          <input id="fd-shiftEnd" type="time" value="${parseTime24(fd?.shiftEnd || '')}">
        </div>
        <div class="form-group full">
          <label for="fd-manager">Reporting Manager ID</label>
          <input id="fd-manager" type="text" placeholder="ADM001" value="${escapeHtml(fd?.reportingManagerId || '')}">
        </div>
        <div class="form-group full">
          <label>Languages <span class="text-muted text-sm">(press Enter or comma to add)</span></label>
          <div class="slot-tags-wrap" id="langTagsWrap">
            <div id="langTags" class="slot-tags"></div>
            <input id="langInput" type="text" placeholder="e.g. English" class="slot-input">
          </div>
          <input type="hidden" id="fd-languages" value="${escapeHtml(JSON.stringify(fd?.languages || []))}">
        </div>
        <div class="form-group full">
          <input type="hidden" id="fd-branchId" value="${escapeHtml(session?.branchId || fd?.branchId || '')}">
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-accent" id="fdSubmitBtn">
          ${isEdit ? '💾 Save Changes' : '➕ Add Staff'}
        </button>
      </div>
    </form>
  `;
}

// ── LANGUAGE TAG INPUT ────────────────────────────────────
function setupLangTags(existing = []) {
  const tagsContainer = $('langTags');
  const input         = $('langInput');
  const hidden        = $('fd-languages');
  if (!tagsContainer || !input || !hidden) return;

  let langs = [...existing];

  function render() {
    tagsContainer.innerHTML = langs.map((l, i) => `
      <span class="slot-tag">
        ${escapeHtml(l)}
        <button type="button" class="slot-tag-remove" onclick="removeLang(${i})">×</button>
      </span>
    `).join('');
    hidden.value = JSON.stringify(langs);
  }

  window.removeLang = function (i) { langs.splice(i, 1); render(); };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const v = input.value.trim().replace(/,$/, '');
      if (v && !langs.includes(v)) { langs.push(v); render(); }
      input.value = '';
    }
  });

  render();
}

// ── SUBMIT ─────────────────────────────────────────────────
async function submitFDForm(e) {
  e.preventDefault();
  const btn = $('fdSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

  try {
    const languages = JSON.parse($('fd-languages')?.value || '[]');
    const body = {
      name:               val('fd-name'),
      email:              val('fd-email'),
      branchId:           val('fd-branchId'),
      phone:              val('fd-phone')      || undefined,
      gender:             val('fd-gender')     || undefined,
      counter:            val('fd-counter')    || undefined,
      shiftStart:         formatTime12(val('fd-shiftStart')) || undefined,
      shiftEnd:           formatTime12(val('fd-shiftEnd'))   || undefined,
      reportingManagerId: val('fd-manager')    || undefined,
      languages,
    };

    if (currentEditId) {
      await apiRequest(`/frontdesk/${currentEditId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      showToast('Staff updated successfully!', 'success');
    } else {
      body.password = val('fd-password');
      await apiRequest('/frontdesk', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      showToast('Staff added successfully!', 'success');
    }

    closeModal();
    await fetchFrontDesk();
  } catch (err) {
    showToast(err.message || 'Operation failed', 'error');
    if (btn) { btn.disabled = false; btn.textContent = currentEditId ? '💾 Save Changes' : '➕ Add Staff'; }
  }
}

// ── DELETE ─────────────────────────────────────────────────
function deleteFrontdesk(userId) {
  confirmAction(
    'Remove Front Desk Staff',
    'Are you sure you want to remove this staff member from the branch? Historical records will be kept.',
    'Remove Staff',
    async () => {
      try {
        await apiRequest(`/frontdesk/${userId}`, { method: 'DELETE' });
        showToast('Staff removed successfully', 'success');
        await fetchFrontDesk();
      } catch (err) {
        showToast(err.message || 'Failed to remove staff', 'error');
      }
    }
  );
}

// ── HELPERS ────────────────────────────────────────────────
function findStaff(id) {
  return allStaff.find(f => (f.userId || f.id) === id) || null;
}

function handleOverlayClick(e) {
  if (e.target === $('modalOverlay')) closeModal();
}

function parseTime24(time12) {
  if (!time12) return '';
  const match = time12.match(/(\\d+):(\\d+)\\s*(AM|PM)/i);
  if (!match) return time12;
  let [_, h, m, ampm] = match;
  let hours = parseInt(h, 10);
  if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
  if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, '0')}:${m}`;
}

function formatTime12(time24) {
  if (!time24) return '';
  let [h, m] = time24.split(':');
  let hours = parseInt(h, 10);
  if (isNaN(hours)) return time24;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours.toString().padStart(2, '0')}:${m} ${ampm}`;
}

// ── BIND EVENTS ────────────────────────────────────────────
function bindFDEvents() {
  $('addFDBtn')?.addEventListener('click', openFDAddModal);
  $('searchInput')?.addEventListener('input', applyFDFilters);
  $('filterGender')?.addEventListener('change', applyFDFilters);
}
