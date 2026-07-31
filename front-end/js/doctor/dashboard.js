/* doctor dashboard.js */
const DOCTOR_API_BASE = 'http://localhost:3000';
let doctorAppointmentsRefreshTimer = null;

(async () => {
  await loadComponents('dashboard', 'Dashboard');

  const profile = getDoctorProfile();
  const bannerTitle = document.querySelector('.banner-title');
  if (bannerTitle) bannerTitle.textContent = `Welcome back, ${profile.name}!`;

  let doctorId = '';
  try {
    const session = JSON.parse(localStorage.getItem('user') || '{}');
    if (session && (session.doctorId || session.id)) doctorId = session.doctorId || session.id;
  } catch (_) {}

  await loadDashboardData(doctorId);
  if (doctorId) {
    startDoctorDashboardRefresh(doctorId);
  }
})();

async function loadDashboardData(doctorId) {
  const appointmentsContainer = document.getElementById('appointmentsList');
  const queueContainer = document.getElementById('doctorQueueList');
  const statToday = document.getElementById('statToday');
  const statCompleted = document.getElementById('statCompleted');

  if (!doctorId) {
    if (appointmentsContainer) {
      appointmentsContainer.innerHTML =
        '<p style="color:var(--text-muted);font-size:.875rem;padding:16px 0;">Doctor session not found.</p>';
    }
    if (queueContainer) {
      queueContainer.innerHTML =
        '<p style="color:var(--text-muted);font-size:.875rem;padding:16px 0;">Doctor session not found.</p>';
    }
    if (statToday) statToday.textContent = '0';
    if (statCompleted) statCompleted.textContent = '0';
    return;
  }

  try {
    const [appointmentsResponse, queueResponse] = await Promise.all([
      fetch(`${DOCTOR_API_BASE}/appointments/doctor/${encodeURIComponent(doctorId)}`, {
        headers: { role: 'doctor' },
      }),
      fetch(`${DOCTOR_API_BASE}/queue/${encodeURIComponent(doctorId)}`, {
        headers: { role: 'doctor' },
      }),
    ]);

    if (!appointmentsResponse.ok) throw new Error('Failed to load appointments');
    if (!queueResponse.ok) throw new Error('Failed to load queue');

    const appointments = await appointmentsResponse.json();
    const queueItems = await queueResponse.json();
    const upcoming = appointments.filter((item) => item.status === 'upcoming');
    const completed = appointments.filter((item) => item.status === 'completed');

    if (statToday) statToday.textContent = upcoming.length;
    if (statCompleted) statCompleted.textContent = completed.length;

    const bannerSub = document.querySelector('.banner-sub');
    if (bannerSub) {
      bannerSub.innerHTML = `You have <strong>${upcoming.length} upcoming appointment${upcoming.length !== 1 ? 's' : ''}</strong> and ${completed.length} completed.`;
    }

    renderDoctorAppointments(appointmentsContainer, appointments);
    renderDoctorQueue(queueContainer, queueItems, doctorId);
  } catch (_) {
    if (appointmentsContainer) {
      appointmentsContainer.innerHTML =
        '<p style="color:var(--text-muted);font-size:.875rem;padding:16px 0;">Could not load appointments.</p>';
    }
    if (queueContainer) {
      queueContainer.innerHTML =
        '<p style="color:var(--text-muted);font-size:.875rem;padding:16px 0;">Could not load queue.</p>';
    }
  }
}

function renderDoctorAppointments(container, appointments) {
  if (!container) return;

  if (!appointments.length) {
    container.innerHTML =
      '<p style="color:var(--text-muted);font-size:.875rem;padding:16px 0;">No appointments found.</p>';
    return;
  }

  container.innerHTML = '';
  appointments.slice(0, 5).forEach((appointment) => {
    const patientName = appointment.patient?.name || appointment.userId || 'Patient';
    const initials = getInitials(patientName);
    const statusClass =
      appointment.status === 'upcoming' ? 'badge-confirm-outline' : 'badge-completed';
    const statusLabel = appointment.status === 'upcoming' ? 'Upcoming' : 'Completed';

    const row = document.createElement('div');
    row.className = 'patient-row';
    row.innerHTML = `
      <div class="patient-left">
        <div class="avatar">${initials}</div>
        <div>
          <div class="patient-name">${patientName}</div>
          <div class="patient-meta">${appointment.date} &middot; ${appointment.slot}</div>
        </div>
      </div>
      <div class="patient-right">
        <span class="badge ${statusClass}">${statusLabel}</span>
        <span class="appt-time">${appointment.slot}</span>
      </div>`;
    container.appendChild(row);
  });
}

function renderDoctorQueue(container, queueItems, doctorId) {
  if (!container) return;

  if (!queueItems.length) {
    container.innerHTML =
      '<p style="color:var(--text-muted);font-size:.875rem;padding:16px 0;">No queue items assigned.</p>';
    return;
  }

  container.innerHTML = '';
  queueItems.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'patient-row';

    const nextAction =
      item.status === 'waiting'
        ? '<button class="btn btn-outline btn-sm" data-next-status="in-consultation">Start</button>'
        : item.status === 'in-consultation'
          ? '<button class="btn btn-outline btn-sm" data-next-status="done">Done</button>'
          : '<span class="badge badge-completed">Done</span>';

    row.innerHTML = `
      <div class="patient-left">
        <div class="avatar">${item.tokenNumber}</div>
        <div>
          <div class="patient-name">${item.patient?.name || item.userId}</div>
          <div class="patient-meta">Token #${item.tokenNumber} · ${item.status}</div>
        </div>
      </div>
      <div class="patient-right">
        ${nextAction}
      </div>`;

    const button = row.querySelector('[data-next-status]');
    if (button) {
      button.addEventListener('click', async () => {
        await updateDoctorQueueStatus(item.id, button.dataset.nextStatus, doctorId);
      });
    }

    container.appendChild(row);
  });
}

function startDoctorDashboardRefresh(doctorId) {
  if (doctorAppointmentsRefreshTimer) return;

  doctorAppointmentsRefreshTimer = window.setInterval(async () => {
    if (document.hidden) return;
    try {
      await loadDashboardData(doctorId);
    } catch (_) {}
  }, 5000);
}

function getInitials(str) {
  return str
    .split(/[\s-]+/)
    .map((word) => word[0]?.toUpperCase() || '')
    .slice(0, 2)
    .join('');
}

async function updateDoctorQueueStatus(id, status, doctorId) {
  if (status === 'in-consultation') {
    const inConsultationCount = dashboardQueueItems.filter(item => item.status === 'in-consultation').length;
    if (inConsultationCount >= 1) {
      alert('Only one patient can be in consultation at a time.');
      return;
    }
  }

  const response = await fetch(`${DOCTOR_API_BASE}/queue/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      role: 'doctor',
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    return;
  }

  await loadDashboardData(doctorId);
}
