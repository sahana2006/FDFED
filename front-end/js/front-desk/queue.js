/* ============================================================
   QUEUE.JS - Queue Management page logic
   ============================================================ */

const QUEUE_API_BASE_URL = 'http://localhost:3000';

let queueItems = [];
let allPatients = [];
let allDoctors = [];
let queueRefreshTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
  renderShell('queue');

  try {
    await Promise.all([loadPatients(), loadDoctors(), loadAllQueueItems()]);
    populatePatientSelect();
    populateDoctorSelect();
    renderQueue();
  } catch (error) {
    console.error('Queue init error:', error);
    showToast('Failed to load queue.', 'error');
    return;
  }

  document.getElementById('doctor-select').addEventListener('change', renderQueue);
  document
    .getElementById('generate-token-btn')
    .addEventListener('click', () => void generateToken());
  document.getElementById('close-token-modal').addEventListener('click', () => {
    document.getElementById('token-modal').classList.add('hidden');
  });

  startQueueRefresh();
});

async function loadPatients() {
  const response = await fetch(`${QUEUE_API_BASE_URL}/patients`, {
    headers: { role: 'frontdesk' },
  });

  if (!response.ok) {
    throw new Error('Failed to load patients');
  }

  allPatients = await response.json();
}

async function loadDoctors() {
  const response = await fetch(`${QUEUE_API_BASE_URL}/doctors`, {
    headers: { role: 'frontdesk' },
  });

  if (!response.ok) {
    throw new Error('Failed to load doctors');
  }

  const payload = await response.json();
  console.log('GET /doctors response (frontdesk queue):', payload);
  allDoctors = payload.map((doctor) => ({
    ...doctor,
    id: doctor.userId || doctor.id,
    userId: doctor.userId || doctor.id,
    slots: Array.isArray(doctor.slots) ? doctor.slots : [],
  }));
}

async function loadAllQueueItems() {
  const response = await fetch(`${QUEUE_API_BASE_URL}/queue`, {
    headers: { role: 'frontdesk' },
  });

  if (!response.ok) {
    throw new Error('Failed to load queue');
  }

  queueItems = await response.json();
}

function populatePatientSelect() {
  const patientSelect = document.getElementById('patient-select');
  patientSelect.innerHTML = '<option value="">Select Patient...</option>';

  allPatients.forEach((patient) => {
    const option = document.createElement('option');
    option.value = patient.userId;
    option.textContent = `${patient.userId} ${patient.firstName} ${patient.lastName}`;
    patientSelect.appendChild(option);
  });
}

function populateDoctorSelect() {
  const doctorSelect = document.getElementById('doctor-select');
  doctorSelect.innerHTML = '<option value="">All Doctors</option>';

  allDoctors.forEach((doctor) => {
    const option = document.createElement('option');
    option.value = doctor.id;
    option.textContent = `${doctor.name} - ${doctor.specialization}`;
    doctorSelect.appendChild(option);
  });
}

function renderQueue() {
  const container = document.getElementById('waiting-list-container');
  const countBadge = document.getElementById('queue-count');
  const selectedDoctorId = document.getElementById('doctor-select').value;

  const visibleItems = selectedDoctorId
    ? queueItems.filter((item) => item.doctorId === selectedDoctorId)
    : queueItems;

  countBadge.textContent = `${visibleItems.length} patient${visibleItems.length !== 1 ? 's' : ''}`;

  if (!visibleItems.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>${selectedDoctorId ? 'No patients in this doctor queue' : 'No patients in queue'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = visibleItems
    .map(
      (item) => `
        <div class="queue-entry queue-entry--${item.status}">
          <div class="queue-entry-info">
            <span class="queue-entry-name">${item.patient?.name || item.userId}</span>
            <div class="queue-entry-meta">
              <span>${item.doctor.name}</span>
              <span>${item.doctor.specialization}</span>
              <span>${item.patient?.phone || item.userId}</span>
            </div>
          </div>
          <div class="queue-entry-right">
            <span class="badge ${getBadgeClass(item.status)}">${item.status}</span>
            <span class="queue-entry-token">Token ${item.tokenNumber}</span>
            <div class="queue-entry-actions">
              ${renderStatusButtons(item)}
            </div>
          </div>
        </div>
      `,
    )
    .join('');

  container.querySelectorAll('[data-next-status]').forEach((button) => {
    button.addEventListener('click', () =>
      updateQueueStatus(button.dataset.id, button.dataset.nextStatus),
    );
  });
}

function renderStatusButtons(item) {
  if (item.status === 'waiting') {
    return `<button class="btn btn-outline btn-sm" data-id="${item.id}" data-next-status="in-consultation">Start</button>`;
  }

  if (item.status === 'in-consultation') {
    return `<button class="btn btn-outline btn-sm" data-id="${item.id}" data-next-status="done">Done</button>`;
  }

  return '';
}

function getBadgeClass(status) {
  switch (status) {
    case 'in-consultation':
      return 'badge-info';
    case 'done':
      return 'badge-success';
    default:
      return 'badge-purple';
  }
}

async function generateToken() {
  const patientId = document.getElementById('patient-select').value;
  const doctorId = document.getElementById('doctor-select').value;

  if (!patientId) {
    showToast('Please select a patient.', 'error');
    return;
  }

  if (!doctorId) {
    showToast('Please select a doctor.', 'error');
    return;
  }

  const response = await fetch(`${QUEUE_API_BASE_URL}/queue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      role: 'frontdesk',
    },
    body: JSON.stringify({
      userId: patientId,
      doctorId,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    showToast(payload?.message || 'Unable to generate token.', 'error');
    return;
  }

  await loadAllQueueItems();
  renderQueue();
  renderNotifications();

  document.getElementById('token-display').textContent = `#${payload.tokenNumber}`;
  document.getElementById('token-modal-details').innerHTML = `
    <strong>${payload.patient?.name || payload.userId}</strong><br/>
    ${payload.doctor.name}
  `;
  document.getElementById('token-modal').classList.remove('hidden');
  document.getElementById('patient-select').value = '';
}

async function updateQueueStatus(id, status) {
  if (status === 'in-consultation') {
    const itemToUpdate = queueItems.find(item => item.id === id);
    if (itemToUpdate) {
      const doctorId = itemToUpdate.doctorId;
      const inConsultationCount = queueItems.filter(
        item => item.doctorId === doctorId && item.status === 'in-consultation'
      ).length;

      if (inConsultationCount >= 1) {
        showToast('Only one patient can be in-consultation at a time for this doctor.', 'error');
        return;
      }
    }
  }

  const response = await fetch(`${QUEUE_API_BASE_URL}/queue/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      role: 'frontdesk',
    },
    body: JSON.stringify({ status }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    showToast(payload?.message || 'Unable to update queue status.', 'error');
    return;
  }

  await loadAllQueueItems();
  renderQueue();
  renderNotifications();
}

function startQueueRefresh() {
  if (queueRefreshTimer) return;

  queueRefreshTimer = window.setInterval(async () => {
    if (document.hidden) return;
    try {
      await loadAllQueueItems();
      renderQueue();
    } catch (_) {}
  }, 5000);
}
