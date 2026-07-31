/* lab-test.js */
(async () => {
  await loadComponents('lab-test', 'Lab Test Package Creation');

  const API_BASE = 'http://localhost:3000';
  const allTests = [
    { name: 'Complete Blood Count', category: 'Hematology' },
    { name: 'Lipid Profile', category: 'Biochemistry' },
    { name: 'Liver Function Test', category: 'Biochemistry' },
    { name: 'Thyroid Function Test', category: 'Endocrine' },
    { name: 'HbA1c', category: 'Diabetes' },
    { name: 'Vitamin D', category: 'Vitamins' },
    { name: 'Blood Glucose', category: 'Diabetes' },
    { name: 'Urine Analysis', category: 'General' },
  ];

  const selected = new Set();
  let assignedLabTests = [];
  let editingAssignmentId = null;

  function getDoctorSession() {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch (_) {
      return {};
    }
  }

  function getDoctorId() {
    const session = getDoctorSession();
    return session.doctorId || session.id || 'DOC001';
  }

  function getUserIdForPatientName(patientName) {
    const normalized = String(patientName || '').trim().toLowerCase();
    if (normalized === 'ria sharma') return 'PAT001';
    return '';
  }

  function getLegacyAssignments() {
    try {
      const items = JSON.parse(localStorage.getItem('labAssignments') || '[]');
      if (!Array.isArray(items)) return [];
      const normalizedItems = items.map((item, index) => ({
        ...item,
        id: item.id || `legacy-${index}`,
      }));
      if (items.some((item) => !item.id)) {
        localStorage.setItem('labAssignments', JSON.stringify(normalizedItems));
      }
      return dedupeLegacyAssignments(normalizedItems);
    } catch (_) {
      return [];
    }
  }

  function dedupeLegacyAssignments(items) {
    const seen = new Set();
    return items.filter((item) => {
      const key = item.id || getAssignmentKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function saveLegacyAssignment(payload) {
    const entry = {
      id: editingAssignmentId?.startsWith('legacy-') ? editingAssignmentId : `legacy-${Date.now()}`,
      userId: payload.userId,
      patientName: payload.patientName,
      patient: payload.patientName,
      doctorId: payload.doctorId,
      doctorName: payload.doctorName,
      packageName: payload.packageName || 'Lab Test Package',
      tests: payload.tests,
      remarks: payload.remarks || '',
      date: new Date().toISOString().split('T')[0],
      status: 'assigned',
    };

    const items = getLegacyAssignments();
    const existingIndex = items.findIndex((item) => item.id === entry.id);
    if (existingIndex >= 0) {
      items[existingIndex] = entry;
    } else {
      items.unshift(entry);
    }
    localStorage.setItem('labAssignments', JSON.stringify(items));
    return entry;
  }

  function removeLegacyAssignments(itemsToRemove) {
    if (!itemsToRemove.length) return;
    const removeKeys = new Set(itemsToRemove.map((item) => getAssignmentKey(item)));
    const remainingItems = getLegacyAssignments().filter((item) => !removeKeys.has(getAssignmentKey(item)));
    localStorage.setItem('labAssignments', JSON.stringify(remainingItems));
  }

  function getAssignmentKey(item) {
    const tests = Array.isArray(item.tests)
      ? item.tests.join(',')
      : String(item.tests || '').split(',').map((test) => test.trim()).filter(Boolean).join(',');
    return [
      item.userId || getUserIdForPatientName(item.patient || item.patientName),
      item.patient || item.patientName,
      item.packageName || 'Lab Test Package',
      tests,
    ].join('|').toLowerCase();
  }

  function loadLegacyAssignmentsForDoctor() {
    assignedLabTests = getLegacyAssignments()
      .map((item, index) => ({
        id: item.id || `legacy-${index}`,
        userId: item.userId || getUserIdForPatientName(item.patient || item.patientName),
        patientName: item.patientName || item.patient || 'Patient',
        doctorId: item.doctorId || getDoctorId(),
        doctorName: item.doctorName || 'Doctor',
        packageName: item.packageName || 'Lab Test Package',
        tests: Array.isArray(item.tests)
          ? item.tests
          : String(item.tests || '').split(',').map((test) => test.trim()).filter(Boolean),
        remarks: item.remarks || '',
        date: item.date || '',
        status: item.status || 'assigned',
      }))
      .filter((item) => item.userId);
  }

  async function migrateLegacyAssignments() {
    if (localStorage.getItem('labAssignmentsMigrated') === 'true') return;

    let legacyAssignments = [];
    try {
      legacyAssignments = JSON.parse(localStorage.getItem('labAssignments') || '[]');
    } catch (_) {
      legacyAssignments = [];
    }
    if (!Array.isArray(legacyAssignments) || !legacyAssignments.length) return;

    const session = getDoctorSession();
    const migrated = [];
    for (const item of legacyAssignments) {
      const userId = getUserIdForPatientName(item.patient);
      if (!userId) continue;

      const response = await fetch(`${API_BASE}/labtests/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', role: 'doctor' },
        body: JSON.stringify({
          userId,
          patientName: item.patient,
          doctorId: getDoctorId(),
          doctorName: session.name || 'Doctor',
          packageName: item.packageName || 'Lab Test Package',
          tests: String(item.tests || '').split(',').map((test) => test.trim()).filter(Boolean),
          remarks: '',
        }),
      });
      if (response.ok) migrated.push(item);
    }

    if (migrated.length) {
      removeLegacyAssignments(migrated);
      localStorage.setItem('labAssignmentsMigrated', 'true');
    }
  }

  function formatAssignedDate(dateValue) {
    if (!dateValue) return '';
    const date = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateValue;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  async function loadAssigned() {
    const response = await fetch(`${API_BASE}/labtests/assignments/doctor/${encodeURIComponent(getDoctorId())}`, {
      headers: { role: 'doctor' },
    });
    if (!response.ok) throw new Error('Unable to load assigned lab tests');
    assignedLabTests = await response.json();
  }

  function renderAssigned() {
    const section = document.getElementById('assignedSection');
    const container = document.getElementById('assignedList');
    container.innerHTML = '';
    section.style.display = assignedLabTests.length > 0 ? '' : 'none';

    assignedLabTests.forEach((item) => {
      const initials = item.patientName
        .split(' ')
        .map((word) => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      const row = document.createElement('div');
      row.className = 'patient-row';
      row.innerHTML = `
        <div class="patient-left">
          <div class="avatar" style="background:var(--accent);">${initials}</div>
          <div>
            <div class="patient-name">${item.patientName}</div>
            <div class="patient-meta">${item.packageName ? item.packageName + ' · ' : ''}${item.tests.join(', ')}</div>
            ${item.remarks ? `<div class="patient-meta">${item.remarks}</div>` : ''}
          </div>
        </div>
        <div class="patient-right">
          <span class="badge badge-confirmed">Assigned</span>
          <span class="date-label">${formatAssignedDate(item.date)}</span>
          <button class="btn btn-outline btn-sm edit-assigned-btn" type="button">Edit</button>
          <button class="btn btn-outline btn-sm delete-assigned-btn" type="button">Delete</button>
        </div>`;
      row.querySelector('.edit-assigned-btn').addEventListener('click', () => startEditAssignment(item));
      row.querySelector('.delete-assigned-btn').addEventListener('click', () => deleteAssignment(item));
      container.appendChild(row);
    });
  }

  function renderTests(filter = '') {
    const grid = document.getElementById('testGrid');
    const filtered = allTests.filter((test) =>
      test.name.toLowerCase().includes(filter.toLowerCase()) ||
      test.category.toLowerCase().includes(filter.toLowerCase()),
    );
    grid.innerHTML = filtered.map((test) => `
      <div class="test-card ${selected.has(test.name) ? 'selected' : ''}" data-name="${test.name}">
        <div class="test-name">${test.name}</div>
        <div class="test-category">${test.category}</div>
      </div>`).join('');
    grid.querySelectorAll('.test-card').forEach((card) => {
      card.addEventListener('click', () => {
        if (selected.has(card.dataset.name)) {
          selected.delete(card.dataset.name);
        } else {
          selected.add(card.dataset.name);
        }
        updatePanel();
        renderTests(document.getElementById('testSearch').value);
      });
    });
  }

  function updatePanel() {
    document.getElementById('selectedCount').textContent = selected.size;
    const list = document.getElementById('selectedTestsList');
    list.innerHTML = [...selected].map((test) => `
      <div class="prescription-item" style="font-size:.8rem;">
        <span>${test}</span>
        <button class="remove-btn" data-name="${test}">&times;</button>
      </div>`).join('');
    list.querySelectorAll('.remove-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        selected.delete(btn.dataset.name);
        updatePanel();
        renderTests(document.getElementById('testSearch').value);
      });
    });
  }

  function resetForm() {
    editingAssignmentId = null;
    selected.clear();
    updatePanel();
    renderTests(document.getElementById('testSearch').value);
    document.getElementById('packageName').value = '';
    document.getElementById('packageRemarks').value = '';
    document.getElementById('patientSelect').value = '';
    document.getElementById('assignBtn').textContent = 'Assign To Patient';
  }

  function getSelectedPatientName(patSel) {
    return patSel.options[patSel.selectedIndex].text
      .split('—')
      .pop()
      .trim();
  }

  function startEditAssignment(item) {
    editingAssignmentId = item.id;
    document.getElementById('patientSelect').value = item.userId;
    document.getElementById('packageName').value = item.packageName || '';
    document.getElementById('packageRemarks').value = item.remarks || '';
    selected.clear();
    item.tests.forEach((test) => selected.add(test));
    updatePanel();
    renderTests(document.getElementById('testSearch').value);
    document.getElementById('assignBtn').textContent = 'Save Changes';
    document.querySelector('.package-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function deleteAssignment(item) {
    const confirmed = window.confirm(`Delete assigned lab package for ${item.patientName}?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`${API_BASE}/labtests/assignments/${encodeURIComponent(item.id)}`, {
        method: 'DELETE',
        headers: { role: 'doctor' },
      });
      if (!response.ok) throw new Error('Delete endpoint unavailable');
      await loadAssigned();
    } catch (_) {
      const remainingItems = getLegacyAssignments().filter((entry) => entry.id !== item.id);
      localStorage.setItem('labAssignments', JSON.stringify(remainingItems));
      loadLegacyAssignmentsForDoctor();
    }

    renderAssigned();
    if (editingAssignmentId === item.id) resetForm();
    showToast('Assigned lab tests deleted', 'info');
  }

  renderTests();
  try {
    await migrateLegacyAssignments();
    await loadAssigned();
    renderAssigned();
  } catch (_) {
    loadLegacyAssignmentsForDoctor();
    renderAssigned();
  }

  document.getElementById('testSearch').addEventListener('input', function () {
    renderTests(this.value);
  });

  document.getElementById('assignBtn').addEventListener('click', async () => {
    const patSel = document.getElementById('patientSelect');
    if (!patSel.value) {
      showToast('Please select a patient.', 'error');
      return;
    }
    if (selected.size === 0) {
      showToast('Please select at least one test.', 'error');
      return;
    }

    const session = getDoctorSession();
    const patientName = getSelectedPatientName(patSel);
    const payload = {
      userId: patSel.value,
      patientName,
      doctorId: getDoctorId(),
      doctorName: session.name || 'Doctor',
      packageName: document.getElementById('packageName').value,
      remarks: document.getElementById('packageRemarks').value,
      tests: [...selected],
    };

    const url = editingAssignmentId
      ? `${API_BASE}/labtests/assignments/${encodeURIComponent(editingAssignmentId)}`
      : `${API_BASE}/labtests/assignments`;
    let savedViaBackend = false;
    try {
      const response = await fetch(url, {
        method: editingAssignmentId && !editingAssignmentId.startsWith('legacy-') ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', role: 'doctor' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Assignment endpoint unavailable');
      }

      savedViaBackend = true;
    } catch (_) {
      saveLegacyAssignment(payload);
    }

    const wasEditing = Boolean(editingAssignmentId);
    if (savedViaBackend) {
      await loadAssigned();
    } else {
      loadLegacyAssignmentsForDoctor();
    }
    renderAssigned();
    showToast(
      wasEditing ? `Assigned tests updated for ${patientName}.` : `${selected.size} test(s) assigned to ${patientName}!`,
      'success',
    );
    resetForm();
  });
})();
