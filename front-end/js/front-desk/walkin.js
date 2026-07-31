/* ============================================================
   WALKIN.JS - Walk-in Registration page logic
   ============================================================ */

const WALKINS_API_BASE_URL = 'http://localhost:3000';
let walkins = [];

document.addEventListener('DOMContentLoaded', async () => {
  renderShell('walkin');

  await refreshWalkIns();

  document
    .getElementById('register-btn')
    .addEventListener('click', handleRegister);
  document
    .getElementById('close-success-modal')
    .addEventListener('click', closeModal);
  document
    .getElementById('modal-close-btn')
    .addEventListener('click', closeModal);
  document.getElementById('modal-book-appointment').addEventListener('click', () => {
    closeModal();
    navigateTo('appointments');
  });

  bindRegistrationModals();
});

async function refreshWalkIns() {
  try {
    const response = await fetch(`${WALKINS_API_BASE_URL}/walkins`, {
      headers: { role: 'frontdesk' }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch walk-ins');
    }

    walkins = await response.json();
    renderRecentRegistrations(walkins);
  } catch (error) {
    console.error('Walk-in fetch error:', error);
    showToast('Failed to load recent registrations.', 'error');
  }
}

async function handleRegister() {
  const fields = [
    { id: 'first-name', errId: 'err-first-name', rules: { required: true } },
    { id: 'last-name', errId: 'err-last-name', rules: { required: true } },
    { id: 'email', errId: 'err-email', rules: { required: true, email: true } },
    { id: 'phone', errId: 'err-phone', rules: { required: true, phone: true } },
    { id: 'dob', errId: 'err-dob', rules: { required: true, dob: true } },
    { id: 'gender', errId: 'err-gender', rules: { required: true } },
    { id: 'blood-group', errId: 'err-blood-group', rules: { required: true } }
  ];

  let valid = true;
  fields.forEach(f => {
    const input = document.getElementById(f.id);
    const errEl = document.getElementById(f.errId);
    if (!validateField(input, errEl, f.rules)) valid = false;
  });

  if (!valid) {
    showToast('Please fix the errors before submitting.', 'error');
    return;
  }

  const newWalkIn = {
    firstName: document.getElementById('first-name').value.trim(),
    lastName: document.getElementById('last-name').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    dob: document.getElementById('dob').value.trim(),
    gender: document.getElementById('gender').value,
    bloodGroup: document.getElementById('blood-group').value,
    guardianName: document.getElementById('guardian').value.trim()
  };

  try {
    const response = await fetch(`${WALKINS_API_BASE_URL}/walkins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        role: 'frontdesk'
      },
      body: JSON.stringify(newWalkIn)
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message || 'Failed to create walk-in registration');
    }

    setSelectedPatient(normalizeRegisteredPatient(payload));
    clearForm();
    await refreshWalkIns();
    openSuccessModal(payload);
    showToast('Walk-in registered successfully.');
  } catch (error) {
    console.error('Walk-in registration error:', error);
    showToast(error.message || 'Failed to register walk-in.', 'error');
  }
}

function renderRecentRegistrations(registrations) {
  const container = document.getElementById('recent-registrations-list');
  if (!container) return;

  if (!registrations.length) {
    container.innerHTML = '<div class="empty-state"><p>No recent registrations</p></div>';
    return;
  }

  const visibleRegistrations = registrations.slice(0, 4);
  container.innerHTML = visibleRegistrations.map(walkin => `
    <div class="recent-reg-entry">
      <div>
        <div class="recent-reg-name">${walkin.firstName} ${walkin.lastName}</div>
        <div class="recent-reg-meta">${walkin.id} | ${calculateAge(walkin.dob)} ${walkin.gender} | ${walkin.phone}</div>
      </div>
      <button class="btn btn-outline btn-sm" data-registration-view="${walkin.id}">View details</button>
    </div>
  `).join('');

  bindRegistrationButtons(registrations);
}

function bindRegistrationButtons(registrations) {
  document.querySelectorAll('[data-registration-view]').forEach(button => {
    button.onclick = () => {
      const walkin = registrations.find(item => item.id === button.dataset.registrationView);
      if (walkin) openRegistrationDetail(walkin);
    };
  });
}

function bindRegistrationModals() {
  const viewAllButton = document.getElementById('view-all-registrations-btn');
  const listModal = document.getElementById('registration-list-modal');
  const listContainer = document.getElementById('registration-list-modal-body');

  viewAllButton?.addEventListener('click', (event) => {
    event.preventDefault();

    listContainer.innerHTML = walkins.map(walkin => `
      <div class="modal-reg-entry">
        <div>
          <div class="recent-reg-name">${walkin.firstName} ${walkin.lastName}</div>
          <div class="recent-reg-meta">${walkin.id} | ${calculateAge(walkin.dob)} ${walkin.gender} | ${walkin.phone}</div>
        </div>
        <button class="btn btn-outline btn-sm" data-modal-registration-view="${walkin.id}">View details</button>
      </div>
    `).join('');

    listContainer.querySelectorAll('[data-modal-registration-view]').forEach(button => {
      button.onclick = () => {
        const walkin = walkins.find(item => item.id === button.dataset.modalRegistrationView);
        if (walkin) {
          listModal.classList.add('hidden');
          openRegistrationDetail(walkin);
        }
      };
    });

    listModal.classList.remove('hidden');
  });

  document.querySelectorAll('[data-close-modal]').forEach(button => {
    button.addEventListener('click', () => {
      document.getElementById(button.dataset.closeModal).classList.add('hidden');
    });
  });
}

function openRegistrationDetail(patient) {
  const container = document.getElementById('registration-detail-body');
  const modal = document.getElementById('registration-detail-modal');
  const age = calculateAge(patient.dob);
  const registrationLabel = patient.registrationId || patient.id;

  container.innerHTML = `
    <div class="modal-success-row"><span>Patient Name</span><span>${patient.firstName} ${patient.lastName}</span></div>
    <div class="modal-success-row"><span>Registration ID</span><span>${registrationLabel}</span></div>
    <div class="modal-success-row"><span>Age &amp; Gender</span><span>${age} ${patient.gender}</span></div>
    <div class="modal-success-row"><span>Email</span><span>${patient.email || '-'}</span></div>
    <div class="modal-success-row"><span>Phone Number</span><span>${patient.phone}</span></div>
    <div class="modal-success-row"><span>Blood Group</span><span>${patient.bloodGroup || '-'}</span></div>
    <div class="modal-success-row"><span>Guardian</span><span>${patient.guardianName || '-'}</span></div>
  `;

  modal.classList.remove('hidden');
}

function openSuccessModal(patient) {
  const age = calculateAge(patient.dob);
  const registrationLabel = patient.registrationId || patient.id;

  document.getElementById('modal-success-body').innerHTML = `
    <div class="modal-success-row"><span>Patient Name</span><span>${patient.firstName} ${patient.lastName}</span></div>
    <div class="modal-success-row"><span>Registration ID</span><span>${registrationLabel}</span></div>
    <div class="modal-success-row"><span>Age &amp; Gender</span><span>${age} ${patient.gender}</span></div>
    <div class="modal-success-row"><span>Phone Number</span><span>${patient.phone}</span></div>
    <div class="modal-success-row"><span>Blood Group</span><span>${patient.bloodGroup}</span></div>
  `;
  document.getElementById('success-modal').classList.remove('hidden');
}

function normalizeRegisteredPatient(patient) {
  const userId = patient.userId || patient.patientId || patient.id;

  return {
    ...patient,
    id: userId,
    userId,
    patientId: userId,
    name:
      patient.name ||
      `${patient.firstName || ''} ${patient.lastName || ''}`.trim() ||
      userId,
    dob: normalizeDobToIso(patient.dob),
  };
}

function normalizeDobToIso(dob) {
  if (!dob) return dob;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) return dob;

  const [day, month, year] = dob.split('-');
  if (!day || !month || !year) return dob;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function clearForm() {
  ['first-name', 'last-name', 'email', 'phone', 'dob', 'guardian'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('gender').value = '';
  document.getElementById('blood-group').value = '';
  document.querySelectorAll('.form-error').forEach(el => el.classList.remove('visible'));
  document.querySelectorAll('.input-field.error').forEach(el => el.classList.remove('error'));
}

function closeModal() {
  document.getElementById('success-modal').classList.add('hidden');
}

function calculateAge(dob) {
  if (!dob) return '';
  let birth;

  if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    birth = new Date(`${dob}T00:00:00`);
  } else {
    const [d, m, y] = dob.split('-').map(Number);
    birth = new Date(y, m - 1, d);
  }

  if (Number.isNaN(birth.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}
