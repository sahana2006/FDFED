(async () => {
  await loadComponents('internal-referral', 'Internal Referral');

  function getDoctorSession() {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch (_) {
      return {};
    }
  }

  const session = getDoctorSession();
  const currentDoctorId = session.doctorId || session.id || 'DOC001';
  const currentDoctorName = session.name || 'Dr. S Madhuri';
  const API_BASE = 'http://localhost:3000';

  async function loadDoctors() {
    try {
      const response = await fetch(`${API_BASE}/doctors`, {
        headers: { role: 'doctor' },
      });
      if (!response.ok) return;
      const doctors = await response.json();
      const doctorSelect = document.getElementById('refDoctor');
      doctorSelect.innerHTML = '<option value="">- Select -</option>';
      doctors.forEach(doc => {
        if (doc.id === currentDoctorId) return;
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = `${doc.name} - ${doc.specialization}`;
        doctorSelect.appendChild(opt);
      });
    } catch(e) {
      console.error(e);
    }
  }

  await loadDoctors();

  const STATIC_REFERRALS = [
    {
      patient: 'Neil Verma',
      doctor: 'Dr. Anil Kumar - Cardiology',
      priority: 'Urgent',
      status: 'Pending',
      statusClass: 'badge-pending',
      date: 'Mar 5, 2026',
      fromDoctorId: currentDoctorId
    },
    {
      patient: 'Alisha Verma',
      doctor: 'Dr. Meena Iyer - Endocrinology',
      priority: 'Routine',
      status: 'Accepted',
      statusClass: 'badge-confirmed',
      date: 'Feb 28, 2026',
      fromDoctorId: currentDoctorId
    },
    {
      patient: 'Arun Menon',
      doctor: currentDoctorName,
      fromDoctorName: 'Dr. Sarah Johnson - Cardiology',
      fromDoctorId: 'DOC003',
      doctorId: currentDoctorId,
      priority: 'Emergency',
      status: 'Assigned',
      statusClass: 'badge-confirmed',
      date: 'Mar 1, 2026'
    }
  ];

  const previousReferralsList = document.getElementById('previousReferralsList');
  const allReferralsList = document.getElementById('allReferralsList');
  const referralModal = document.getElementById('referralModal');
  const viewAllReferralsBtn = document.getElementById('viewAllReferralsBtn');
  const closeReferralModal = document.getElementById('closeReferralModal');

  const incomingReferralsList = document.getElementById('incomingReferralsList');
  const allIncomingList = document.getElementById('allIncomingList');
  const incomingModal = document.getElementById('incomingModal');
  const viewAllIncomingBtn = document.getElementById('viewAllIncomingBtn');
  const closeIncomingModal = document.getElementById('closeIncomingModal');

  function getSavedReferrals() {
    return JSON.parse(localStorage.getItem('referralHistory') || '[]');
  }

  function saveReferral(ref) {
    const list = getSavedReferrals();
    list.unshift(ref);
    localStorage.setItem('referralHistory', JSON.stringify(list));
  }

  function getAllReferrals() {
    return [...getSavedReferrals(), ...STATIC_REFERRALS];
  }

  function buildReferralRow(ref) {
    const initials = ref.patient.split(' ').filter(Boolean).map(word => word[0]).join('').toUpperCase().slice(0, 2);
    const colors = ['#5c7a60', '#3a7d44', '#7a5c60', '#5c6a7a', '#6a7a5c'];
    const color = colors[Math.abs(ref.patient.charCodeAt(0) % colors.length)];
    return `
      <div class="patient-row">
        <div class="patient-left">
          <div class="avatar" style="background:${color};">${initials}</div>
          <div>
            <div class="patient-name">${ref.patient}</div>
            <div class="patient-meta">Referred to ${ref.doctor} - ${ref.priority}</div>
          </div>
        </div>
        <div class="patient-right">
          <span class="badge ${ref.statusClass || 'badge-pending'}">${ref.status || 'Pending'}</span>
          <span class="date-label">${ref.date}</span>
        </div>
      </div>`;
  }

  function buildIncomingRow(ref) {
    const initials = ref.patient.split(' ').filter(Boolean).map(word => word[0]).join('').toUpperCase().slice(0, 2);
    const colors = ['#5c7a60', '#3a7d44', '#7a5c60', '#5c6a7a', '#6a7a5c'];
    const color = colors[Math.abs(ref.patient.charCodeAt(0) % colors.length)];
    const fromDoctor = ref.fromDoctorName || 'Another Doctor';
    return `
      <div class="patient-row">
        <div class="patient-left">
          <div class="avatar" style="background:${color};">${initials}</div>
          <div>
            <div class="patient-name">${ref.patient}</div>
            <div class="patient-meta">Referred by ${fromDoctor} - ${ref.priority}</div>
          </div>
        </div>
        <div class="patient-right">
          <span class="badge ${ref.statusClass || 'badge-pending'}">${ref.status || 'Pending'}</span>
          <span class="date-label">${ref.date}</span>
        </div>
      </div>`;
  }

  function renderHistory() {
    const all = getAllReferrals();
    
    const outgoing = all.filter(ref => ref.fromDoctorId === currentDoctorId || (!ref.fromDoctorId && !ref.doctorId));
    previousReferralsList.innerHTML = outgoing.slice(0, 3).map(buildReferralRow).join('');
    allReferralsList.innerHTML = outgoing.map(buildReferralRow).join('');

    const incoming = all.filter(ref => ref.doctorId === currentDoctorId);
    if (incoming.length === 0) {
        incomingReferralsList.innerHTML = '<p style="color:var(--text-muted);font-size:.875rem;padding:20px 0;text-align:center;">No incoming referrals</p>';
        allIncomingList.innerHTML = '<p style="color:var(--text-muted);font-size:.875rem;padding:20px 0;text-align:center;">No incoming referrals</p>';
    } else {
        incomingReferralsList.innerHTML = incoming.slice(0, 3).map(buildIncomingRow).join('');
        allIncomingList.innerHTML = incoming.map(buildIncomingRow).join('');
    }
  }

  function openReferralModal() {
    referralModal.classList.add('open');
  }

  function closeReferralModalPanel() {
    referralModal.classList.remove('open');
  }

  viewAllReferralsBtn.addEventListener('click', (event) => {
    event.preventDefault();
    openReferralModal();
  });

  closeReferralModal.addEventListener('click', closeReferralModalPanel);
  referralModal.addEventListener('click', (event) => {
    if (event.target === referralModal) {
      closeReferralModalPanel();
    }
  });

  viewAllIncomingBtn.addEventListener('click', (event) => {
    event.preventDefault();
    incomingModal.classList.add('open');
  });

  closeIncomingModal.addEventListener('click', () => {
      incomingModal.classList.remove('open');
  });

  incomingModal.addEventListener('click', (event) => {
    if (event.target === incomingModal) {
      incomingModal.classList.remove('open');
    }
  });

  document.getElementById('sendReferralBtn').addEventListener('click', () => {
    const patientEl = document.getElementById('refPatient');
    const doctorEl = document.getElementById('refDoctor');
    const patientId = patientEl.value;
    const doctorId = doctorEl.value;
    const patientName = patientEl.options[patientEl.selectedIndex].text.replace(/^PAT-\d+ - /, '');
    const doctorName = doctorEl.options[doctorEl.selectedIndex].text;
    const reason = document.getElementById('refReason').value;
    const priority = document.getElementById('refPriority').value;
    const date = document.getElementById('refDate').value;

    if (!patientId || !doctorId) {
      showToast('Please fill in required fields.', 'error');
      return;
    }

    const ref = {
      patientId,
      patient: patientName,
      doctorId,
      doctor: doctorName,
      fromDoctorId: currentDoctorId,
      fromDoctorName: currentDoctorName,
      reason,
      priority,
      status: 'Pending',
      statusClass: 'badge-pending',
      date: date
        ? new Date(date).toLocaleDateString('en-CA')
        : new Date().toLocaleDateString('en-CA')
    };

    saveReferral(ref);
    renderHistory();
    showToast('Referral sent successfully!', 'success');

    ['refPatient', 'refDoctor', 'refReason', 'refNotes', 'refDate'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('refPriority').value = 'Routine';
  });

  renderHistory();
})();
