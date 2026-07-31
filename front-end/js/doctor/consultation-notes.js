(async () => {
  await loadComponents('consultation-notes', 'Consultation Notes');

  const API_BASE = 'http://localhost:3000';

  const listView = document.getElementById('listView');
  const noteDetailView = document.getElementById('noteDetailView');
  const searchInput = document.getElementById('searchInput');
  const appointmentSearchResults = document.getElementById('patientSearchResults');
  const recordsList = document.getElementById('recordsList');
  const recordsModal = document.getElementById('recordsModal');
  const allRecordsList = document.getElementById('allRecordsList');

  let appointments = [];
  let doctorAppointments = [];
  let selectedAppointment = null;
  let currentRecord = null;

  let consultationRecords = [];

  function getDoctorSession() {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch (_) {
      return {};
    }
  }

  function getDoctorId() {
    const session = getDoctorSession();
    return session.doctorId || session.id || '';
  }

  function getPatient(appointment) {
    if (appointment.patient) {
      const patientName = appointment.patient.name || `${appointment.patient.firstName || ''} ${appointment.patient.lastName || ''}`.trim();
      return {
        id: appointment.patient.userId || appointment.userId,
        name: patientName || appointment.userId,
        age: appointment.patient.age || '',
        gender: appointment.patient.gender || '',
        initials: getInitials(patientName || appointment.userId),
      };
    }

    const fallbackId = appointment.userId || appointment.patientId || 'PATIENT';
    return {
      id: fallbackId,
      name: fallbackId,
      age: '',
      gender: '',
      initials: getInitials(fallbackId),
    };
  }

  function getInitials(str) {
    return String(str || '?')
      .split(/[\s-]+/)
      .map((part) => part[0]?.toUpperCase() || '')
      .slice(0, 2)
      .join('');
  }

  function formatDisplayDate(dateValue) {
    if (!dateValue) return '';
    const date = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateValue;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function toPipeList(value) {
    if (!value) return '';
    const text = String(value);
    const separator = text.includes('|') ? '|' : ',';
    return text
      .split(separator)
      .map((item) => item.trim())
      .filter(Boolean)
      .join('|');
  }

  function getAppointmentById(appointmentId) {
    return doctorAppointments.find((appointment) => appointment.id === appointmentId) || null;
  }

  function normalizeMedicalRecord(record) {
    const appointment = getAppointmentById(record.appointmentId);
    const patient = appointment ? getPatient(appointment) : {
      id: record.patientId || 'PATIENT',
      name: record.patientId || 'Patient',
      age: '',
      gender: '',
      initials: getInitials(record.patientId || 'Patient'),
    };

    return {
      id: record.id,
      appointmentId: record.appointmentId || '',
      patientId: record.patientId,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      initials: patient.initials || getInitials(patient.name),
      notes: record.consultationNote || '',
      meds: toPipeList(record.medicines),
      labs: toPipeList(record.tests),
      date: record.date || appointment?.date || '',
      slot: appointment?.slot || '',
      followUp: record.followUpDate || record.followUp || '',
    };
  }

  function addPrescriptionItem(container, text) {
    const div = document.createElement('div');
    div.className = 'prescription-item';
    div.innerHTML = `<span>${text}</span><button class="remove-btn" title="Remove">&times;</button>`;
    div.querySelector('.remove-btn').addEventListener('click', () => div.remove());
    container.appendChild(div);
  }

  async function loadAppointments() {
    if (!getDoctorId()) {
      doctorAppointments = [];
      appointments = [];
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/appointments/doctor/${encodeURIComponent(getDoctorId())}`, {
        headers: { role: 'doctor' },
      });
      if (!response.ok) throw new Error('Unable to load appointments');
      const data = await response.json();
      doctorAppointments = data;
      appointments = data.filter((appointment) => appointment.status === 'upcoming');
    } catch (_) {
      doctorAppointments = [];
      appointments = [];
    }
  }

  async function loadConsultationRecords() {
    try {
      const response = await fetch(`${API_BASE}/medical-records/doctor/${encodeURIComponent(getDoctorId())}`, {
        headers: { role: 'doctor' },
      });
      if (!response.ok) throw new Error('Unable to load consultation records');
      const records = await response.json();
      consultationRecords = records
        .filter((record) => record.type === 'consultation')
        .map(normalizeMedicalRecord);
    } catch (_) {
      consultationRecords = [];
    }
  }

  function renderAppointmentSearch(query = '') {
    const normalized = query.trim().toLowerCase();
    appointmentSearchResults.innerHTML = '';

    const matches = normalized ? appointments.filter((appointment) => {
      const patient = getPatient(appointment);
      return `${appointment.id} ${patient.id} ${patient.name} ${appointment.date} ${appointment.slot}`
        .toLowerCase()
        .includes(normalized);
    }) : appointments;

    if (!matches.length) {
      appointmentSearchResults.innerHTML = '<button type="button" class="patient-search-option empty" disabled>No upcoming appointments found</button>';
      appointmentSearchResults.classList.add('open');
      return;
    }

    matches.forEach((appointment) => {
      const patient = getPatient(appointment);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'patient-search-option';
      btn.innerHTML = `
        <span><strong>${patient.name}</strong><small>${appointment.id} | ${formatDisplayDate(appointment.date)} | ${appointment.slot}</small></span>
        <span>${appointment.status || 'upcoming'}</span>`;
      btn.addEventListener('click', () => selectAppointment(appointment));
      appointmentSearchResults.appendChild(btn);
    });

    appointmentSearchResults.classList.add('open');
  }

  function selectAppointment(appointment) {
    selectedAppointment = appointment;
    const patient = getPatient(appointment);
    searchInput.value = `${appointment.id} - ${patient.name} - ${formatDisplayDate(appointment.date)} ${appointment.slot}`;
    appointmentSearchResults.classList.remove('open');
  }

  function setDetailData(record) {
    currentRecord = record;
    document.getElementById('detailAvatar').textContent = record.initials || getInitials(record.name);
    document.getElementById('detailName').textContent = record.name || 'Patient';
    document.getElementById('detailMeta').textContent = [
      record.age && record.gender ? `${record.age} | ${record.gender}` : '',
      record.appointmentId ? `Appointment ${record.appointmentId}` : '',
      record.slot ? `Slot ${record.slot}` : '',
    ].filter(Boolean).join(' - ');
    document.getElementById('noteDate').value = record.date || '';
    document.getElementById('noteText').value = record.notes || '';
    document.getElementById('followUpDate').value = record.followUp || '';

    const medList = document.getElementById('medicineList');
    medList.innerHTML = '';
    (record.meds || '').split('|').filter(Boolean).forEach((medicine) => addPrescriptionItem(medList, medicine));

    const labList = document.getElementById('labList');
    labList.innerHTML = '';
    (record.labs || '').split('|').filter(Boolean).forEach((lab) => addPrescriptionItem(labList, lab));
  }

  function showDetail(record, readOnly = false) {
    setDetailData(record);
    document.getElementById('saveNoteBtn').style.display = readOnly ? 'none' : '';
    document.getElementById('cancelNoteBtn').textContent = readOnly ? 'Close' : 'Cancel';
    listView.style.display = 'none';
    noteDetailView.style.display = 'block';
  }

  function showList() {
    noteDetailView.style.display = 'none';
    listView.style.display = 'block';
    document.getElementById('saveNoteBtn').style.display = '';
    document.getElementById('cancelNoteBtn').textContent = 'Cancel';
    renderRecords();
  }

  function buildRecordRow(record) {
    const row = document.createElement('div');
    row.className = 'patient-row';
    row.dataset.patient = record.name;
    row.dataset.patientId = record.patientId;
    row.innerHTML = `
      <div class="patient-left">
        <div class="avatar" style="background:var(--accent);">${record.initials || getInitials(record.name)}</div>
        <div>
          <div class="patient-name">${record.name} <span class="meta-inline">${[record.age, record.gender].filter(Boolean).join(' | ')}</span></div>
          <div class="patient-meta">${record.notes || 'No consultation notes entered yet.'}</div>
        </div>
      </div>
      <div class="patient-right">
        <span class="date-label">${formatDisplayDate(record.date)}</span>
        <button class="btn-view view-btn" type="button">View</button>
      </div>`;
    row.querySelector('.view-btn').addEventListener('click', () => {
      closeRecordsModalPanel();
      showDetail(record, true);
    });
    return row;
  }

  function renderRecords(filter = searchInput.value) {
    const normalized = filter.trim().toLowerCase();
    const matches = consultationRecords.filter((record) =>
      `${record.name} ${record.patientId} ${record.appointmentId} ${record.notes}`.toLowerCase().includes(normalized),
    );

    recordsList.innerHTML = '';
    if (!matches.length) {
      recordsList.innerHTML = '<p style="color:var(--text-muted);font-size:.875rem;text-align:center;padding:20px 0;">No consultation records found.</p>';
      return;
    }

    matches.slice(0, 3).forEach((record) => recordsList.appendChild(buildRecordRow(record)));
  }

  function renderUpcomingAppointments() {
    const upcomingAppointmentsList = document.getElementById('upcomingAppointmentsList');
    if (!upcomingAppointmentsList) return;
    upcomingAppointmentsList.innerHTML = '';
    
    if (!appointments.length) {
      upcomingAppointmentsList.innerHTML = '<p style="color:var(--text-muted);font-size:.875rem;text-align:center;padding:20px 0;">No upcoming appointments.</p>';
      return;
    }
    
    const sorted = [...appointments].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.slot}`);
      const dateB = new Date(`${b.date}T${b.slot}`);
      return dateA - dateB;
    });

    sorted.slice(0, 5).forEach((appointment) => {
      const patient = getPatient(appointment);
      const row = document.createElement('div');
      row.className = 'patient-row';
      row.innerHTML = `
        <div class="patient-left">
          <div class="avatar" style="background:var(--accent);">${patient.initials}</div>
          <div>
            <div class="patient-name">${patient.name} <span class="meta-inline">${[patient.age, patient.gender].filter(Boolean).join(' | ')}</span></div>
            <div class="patient-meta">Appointment: ${appointment.id}</div>
          </div>
        </div>
        <div class="patient-right">
          <span class="date-label">${formatDisplayDate(appointment.date)} ${appointment.slot}</span>
          <button class="btn-view select-apt-btn" type="button" style="padding: 6px 12px; font-size: .8rem; border-radius: var(--radius-sm); border: 1.5px solid var(--accent); color: var(--accent); background: transparent; cursor: pointer; transition: all 0.2s ease;">Select</button>
        </div>`;
      row.querySelector('.select-apt-btn').addEventListener('click', () => {
        selectAppointment(appointment);
        searchInput.focus();
        // Optional: you could scroll up or trigger search
      });
      row.querySelector('.select-apt-btn').addEventListener('mouseover', (e) => {
        e.target.style.background = 'var(--accent)';
        e.target.style.color = 'var(--white)';
      });
      row.querySelector('.select-apt-btn').addEventListener('mouseout', (e) => {
        e.target.style.background = 'transparent';
        e.target.style.color = 'var(--accent)';
      });
      upcomingAppointmentsList.appendChild(row);
    });
  }

  function openRecordsModal() {
    allRecordsList.innerHTML = '';
    consultationRecords.forEach((record) => allRecordsList.appendChild(buildRecordRow(record)));
    recordsModal.classList.add('open');
    recordsModal.setAttribute('aria-hidden', 'false');
  }

  function closeRecordsModalPanel() {
    recordsModal.classList.remove('open');
    recordsModal.setAttribute('aria-hidden', 'true');
  }

  document.getElementById('createNoteBtn').addEventListener('click', () => {
    if (!selectedAppointment) {
      showToast('Select an appointment first.', 'error');
      searchInput.focus();
      searchInput.classList.add('input-error');
      setTimeout(() => searchInput.classList.remove('input-error'), 1500);
      return;
    }

    const patient = getPatient(selectedAppointment);
    showDetail({
      id: `REC${Date.now()}`,
      appointmentId: selectedAppointment.id,
      patientId: patient.id,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      initials: patient.initials,
      date: selectedAppointment.date,
      slot: selectedAppointment.slot,
      notes: '',
      meds: '',
      labs: '',
    });
  });

  document.getElementById('backBtn').addEventListener('click', showList);
  document.getElementById('cancelNoteBtn').addEventListener('click', showList);

  document.getElementById('saveNoteBtn').addEventListener('click', async () => {
    const dateVal = document.getElementById('noteDate').value;
    const notesText = document.getElementById('noteText').value.trim();
    const meds = [...document.querySelectorAll('#medicineList .prescription-item span')].map((s) => s.textContent).join('|');
    const labs = [...document.querySelectorAll('#labList .prescription-item span')].map((s) => s.textContent).join('|');

    if (!notesText && !meds && !labs) {
      showToast('Enter consultation details before saving.', 'error');
      document.getElementById('noteText').focus();
      return;
    }

    const note = {
      ...currentRecord,
      id: currentRecord?.id || `REC${Date.now()}`,
      notes: notesText,
      meds,
      labs,
      date: dateVal,
      followUp: document.getElementById('followUpDate')?.value || '',
    };

    try {
      const session = getDoctorSession();
      const response = await fetch(`${API_BASE}/medical-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', role: 'doctor' },
        body: JSON.stringify({
          doctorId: getDoctorId(),
          patientId: note.patientId,
          appointmentId: note.appointmentId,
          type: 'consultation',
          doctorName: session.name || 'Doctor',
          specialization: session.specialization || 'General',
          date: note.date,
          consultationNote: note.notes,
          medicines: note.meds.replace(/\|/g, ', '),
          tests: note.labs.replace(/\|/g, ', '),
          followUp: note.followUp,
          followUpDate: note.followUp,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.message || 'Unable to save consultation note');
      }

      const savedRecord = await response.json();
      note.id = savedRecord.id || note.id;
    } catch (error) {
      showToast(error.message || 'Unable to save consultation note', 'error');
      return;
    }

    const existingIndex = consultationRecords.findIndex((record) => record.id === note.id);
    if (existingIndex >= 0) {
      consultationRecords[existingIndex] = note;
    } else {
      consultationRecords.unshift(note);
    }

    selectedAppointment = null;
    searchInput.value = '';
    await loadAppointments();
    await loadConsultationRecords();
    renderUpcomingAppointments();
    renderRecords('');
    showToast('Consultation note saved and appointment marked completed.', 'success');
    showList();
  });

  document.getElementById('addMedBtn').addEventListener('click', () => {
    const medicine = prompt('Medicine name and dosage:');
    if (medicine) addPrescriptionItem(document.getElementById('medicineList'), medicine);
  });

  document.getElementById('addLabBtn').addEventListener('click', () => {
    const lab = prompt('Lab test name:');
    if (lab) addPrescriptionItem(document.getElementById('labList'), lab);
  });

  searchInput.addEventListener('input', function () {
    selectedAppointment = null;
    renderAppointmentSearch(this.value);
    renderRecords(this.value);
  });

  searchInput.addEventListener('click', () => renderAppointmentSearch(searchInput.value));
  searchInput.addEventListener('focus', () => renderAppointmentSearch(searchInput.value));
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.patient-search-shell')) {
      appointmentSearchResults.classList.remove('open');
    }
  });

  document.getElementById('viewAllRecordsLink').addEventListener('click', (event) => {
    event.preventDefault();
    openRecordsModal();
  });

  document.getElementById('closeRecordsModal').addEventListener('click', closeRecordsModalPanel);
  recordsModal.addEventListener('click', (event) => {
    if (event.target === recordsModal) closeRecordsModalPanel();
  });

  await loadAppointments();
  await loadConsultationRecords();
  renderUpcomingAppointments();
  renderRecords('');
})();
