const DASHBOARD_API_BASE_URL = 'http://localhost:3000';

let dashboardUpcomingAppointments = [];
let dashboardBookedLabTests = [];
let dashboardPendingLabTests = [];
let dashboardQueueItems = [];
let dashboardDoctorQueueItems = [];
let dashboardEditingAppointment = null;
let dashboardSelectedSlot = null;
let dashboardRefreshTimer = null;

async function initializeDashboard() {
  updateTopbarUser();

  const session = requireRole('patient');
  if (!session) return;

  setText('welcomeName', session.firstName || session.name || 'there');

  await Promise.all([
    loadUpcomingAppointments(session.id),
    loadQueueItems(session.id),
    loadBookedLabTests(session.id),
    loadPendingLabTests(session.id),
  ]);

  renderDashboard();
  startDashboardRefresh(session.id);
}

async function loadUpcomingAppointments(userId) {
  const response = await fetch(
    `${DASHBOARD_API_BASE_URL}/appointments/user/${encodeURIComponent(userId)}?status=upcoming`,
    {
      headers: {
        role: 'patient',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to load upcoming appointments');
  }

  dashboardUpcomingAppointments = await response.json();
}

async function loadQueueItems(userId) {
  const response = await fetch(
    `${DASHBOARD_API_BASE_URL}/queue/user/${encodeURIComponent(userId)}`,
    {
      headers: {
        role: 'patient',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to load queue status');
  }

  dashboardQueueItems = await response.json();
  dashboardDoctorQueueItems = [];

  if (dashboardQueueItems.length) {
    const doctorResponse = await fetch(
      `${DASHBOARD_API_BASE_URL}/queue/${encodeURIComponent(dashboardQueueItems[0].doctorId)}`,
      {
        headers: {
          role: 'patient',
        },
      },
    );

    if (doctorResponse.ok) {
      dashboardDoctorQueueItems = await doctorResponse.json();
    }
  }
}

async function loadBookedLabTests(userId) {
  const response = await fetch(
    `${DASHBOARD_API_BASE_URL}/labtests/history/${encodeURIComponent(userId)}`,
    {
      headers: {
        role: 'patient',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to load booked lab tests');
  }

  dashboardBookedLabTests = await response.json();
}

async function loadPendingLabTests(userId) {
  const response = await fetch(
    `${DASHBOARD_API_BASE_URL}/labtests/cart/${encodeURIComponent(userId)}`,
    {
      headers: {
        role: 'patient',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to load pending lab tests');
  }

  dashboardPendingLabTests = await response.json();
}

function renderDashboard() {
  setText('upcomingCount', dashboardUpcomingAppointments.length);
  setText('labCount', dashboardBookedLabTests.length + dashboardPendingLabTests.length);
  setText('recordCount', '0');

  renderUpcomingAppointments();
  renderQueueStatus();
  renderLabOrders();
}

function renderUpcomingAppointments() {
  const container = document.getElementById('upcomingList');
  if (!container) return;
  container.innerHTML = '';

  if (!dashboardUpcomingAppointments.length) {
    container.appendChild(createEmptyDashItem('No upcoming appointments'));
    return;
  }

  dashboardUpcomingAppointments.forEach((appointment) => {
    container.appendChild(
      createDashItem({
        title: appointment.doctor.name,
        sub: `${appointment.doctor.specialization} | ${formatDate(appointment.date)} at ${appointment.slot} | ${appointment.status}`,
        badge: 'Upcoming',
        colour: 'badge-blue',
        actions: [
          {
            label: 'Edit',
            onClick: () => {
              void openAppointmentEditModal(appointment.id);
            },
          },
          {
            label: 'Cancel',
            onClick: () => {
              void cancelDashboardAppointment(appointment.id);
            },
          },
        ],
      }),
    );
  });
}

function renderQueueStatus() {
  const container = document.getElementById('queueStatusCard');
  if (!container) return;

  if (!dashboardQueueItems.length) {
    container.innerHTML =
      '<div class="dash-item"><div><div class="dash-item-sub">No active queue token</div></div></div>';
    return;
  }

  const currentQueue = dashboardQueueItems[0];
  const nowServing = dashboardDoctorQueueItems.find(
    (item) => item.status === 'in-consultation',
  );

  container.innerHTML = `
    <div class="dash-item">
      <div>
        <div class="dash-item-title">Token #${currentQueue.tokenNumber}</div>
        <div class="dash-item-sub">${currentQueue.doctor.name} | Status: ${currentQueue.status}</div>
        <div class="dash-item-sub">Now Serving: ${nowServing ? `#${nowServing.tokenNumber}` : 'Not started yet'}</div>
      </div>
      <div class="dash-item-meta">
        <span class="badge ${currentQueue.status === 'in-consultation' ? 'badge-green' : 'badge-orange'}">${currentQueue.status}</span>
      </div>
    </div>
  `;
}

function renderLabOrders() {
  const container = document.getElementById('labOrdersList');
  if (!container) return;
  container.innerHTML = '';

  const rows = [
    ...dashboardPendingLabTests.map((booking) => ({
      title: booking.labTest.name,
      sub: `${booking.labTest.category} | Pending in cart`,
      badge: 'Pending',
      colour: 'badge-orange',
    })),
    ...dashboardBookedLabTests.map((booking) => ({
      title: booking.labTest.name,
      sub: `${booking.labTest.category} | Booked`,
      badge: 'Booked',
      colour: 'badge-green',
    })),
  ];

  if (!rows.length) {
    container.appendChild(createEmptyDashItem('No lab orders yet'));
    return;
  }

  rows.forEach((row) => {
    container.appendChild(createDashItem(row));
  });
}

function createDashItem(row) {
  const frag = document.getElementById('tpl-dash-item').content.cloneNode(true);
  const item = frag.querySelector('.dash-item');
  item.querySelector('.dash-item-title').textContent = row.title;
  item.querySelector('.dash-item-sub').textContent = row.sub;

  const meta = item.querySelector('.dash-item-meta');
  if (row.badge) {
    const badge = document.createElement('span');
    badge.className = `badge ${row.colour || 'badge-blue'}`;
    badge.textContent = row.badge;
    meta.appendChild(badge);
  }

  if (Array.isArray(row.actions)) {
    row.actions.forEach((action) => {
      if (!action?.label || typeof action.onClick !== 'function') {
        return;
      }

      const button = document.createElement('button');
      button.className = 'btn btn-outline btn-sm dash-action-btn';
      button.textContent = action.label;
      button.onclick = action.onClick;
      meta.appendChild(button);
    });
  }

  return frag;
}

function createEmptyDashItem(message) {
  return createDashItem({
    title: '',
    sub: message,
  });
}

async function openAppointmentEditModal(appointmentId) {
  dashboardEditingAppointment = dashboardUpcomingAppointments.find(
    (appointment) => appointment.id === appointmentId,
  );
  if (!dashboardEditingAppointment) {
    showToast('Appointment not found', 'error');
    return;
  }

  currentEditId = appointmentId;
  dashboardSelectedSlot = dashboardEditingAppointment.slot;
  openModal(`
    <div class="modal-title">Edit Appointment</div>
    <div class="form-group mb-16">
      <label>Doctor</label>
      <input id="editAppointmentDoctor" value="${dashboardEditingAppointment.doctor.name}" disabled>
    </div>
    <div class="form-group mb-16">
      <label>Date</label>
      <input type="date" id="editAppointmentDate" min="${today()}" value="${dashboardEditingAppointment.date}">
    </div>
    <div class="form-group mb-16">
      <label>Available Slots</label>
      <div id="editAppointmentSlots" class="dash-slot-grid"></div>
    </div>
    <button class="btn btn-primary btn-full" onclick="saveAppointmentEdit()">Save Changes</button>
  `);

  const dateInput = document.getElementById('editAppointmentDate');
  dateInput.addEventListener('change', function () {
    dashboardSelectedSlot = null;
    void loadEditSlots(this.value);
  });

  await loadEditSlots(dashboardEditingAppointment.date);
}

async function loadEditSlots(date) {
  if (!dashboardEditingAppointment || !date) return;

  const response = await fetch(
    `${DASHBOARD_API_BASE_URL}/doctors/${encodeURIComponent(dashboardEditingAppointment.doctorId)}/slots?date=${encodeURIComponent(date)}`,
    {
      headers: {
        role: 'patient',
      },
    },
  );

  if (!response.ok) {
    showToast('Unable to load slots', 'error');
    return;
  }

  const slots = await response.json();
  const displaySlots = new Set(slots);
  if (date === dashboardEditingAppointment.date) {
    displaySlots.add(dashboardEditingAppointment.slot);
  }

  if (!displaySlots.has(dashboardSelectedSlot)) {
    dashboardSelectedSlot = date === dashboardEditingAppointment.date
      ? dashboardEditingAppointment.slot
      : null;
  }

  renderEditSlots(Array.from(displaySlots));
}

function renderEditSlots(slots) {
  const container = document.getElementById('editAppointmentSlots');
  if (!container) return;
  container.innerHTML = '';

  if (!slots.length) {
    const msg = document.createElement('p');
    msg.className = 'text-muted';
    msg.textContent = 'No available slots for this date.';
    container.appendChild(msg);
    return;
  }

  slots.forEach((slot) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'slot-btn';
    button.textContent = slot;
    if (slot === dashboardSelectedSlot) {
      button.classList.add('selected');
    }
    button.onclick = function () {
      dashboardSelectedSlot = slot;
      renderEditSlots(slots);
    };
    container.appendChild(button);
  });
}

async function saveAppointmentEdit() {
  if (!dashboardEditingAppointment || !currentEditId) {
    showToast('No appointment selected', 'error');
    return;
  }

  const session = requireRole('patient');
  const date = val('editAppointmentDate');
  if (!session) return;

  if (!date) {
    showToast('Please choose a date', 'error');
    return;
  }

  if (!dashboardSelectedSlot) {
    showToast('Please choose a slot', 'error');
    return;
  }

  const response = await fetch(
    `${DASHBOARD_API_BASE_URL}/appointments/${encodeURIComponent(currentEditId)}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        role: 'patient',
      },
      body: JSON.stringify({
        date,
        slot: dashboardSelectedSlot,
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    showToast(errorBody?.message || 'Unable to update appointment', 'error');
    return;
  }

  await Promise.all([
    loadUpcomingAppointments(session.id),
    loadQueueItems(session.id),
    loadBookedLabTests(session.id),
    loadPendingLabTests(session.id),
  ]);
  renderDashboard();
  dashboardEditingAppointment = null;
  dashboardSelectedSlot = null;
  closeModal();
  showToast('Appointment updated', 'success');
}

async function cancelDashboardAppointment(appointmentId) {
  const appointment = dashboardUpcomingAppointments.find(
    (item) => item.id === appointmentId && item.status === 'upcoming',
  );

  if (!appointment) {
    showToast('Only upcoming appointments can be cancelled', 'error');
    return;
  }

  const confirmed = window.confirm(
    `Cancel appointment with ${appointment.doctor.name} on ${formatDate(appointment.date)} at ${appointment.slot}?`,
  );
  if (!confirmed) return;

  const response = await fetch(
    `${DASHBOARD_API_BASE_URL}/appointments/${encodeURIComponent(appointmentId)}`,
    {
      method: 'DELETE',
      headers: {
        role: 'patient',
      },
    },
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    showToast(errorBody?.message || 'Unable to cancel appointment', 'error');
    return;
  }

  const session = requireRole('patient');
  if (!session) return;

  await Promise.all([
    loadUpcomingAppointments(session.id),
    loadQueueItems(session.id),
    loadBookedLabTests(session.id),
    loadPendingLabTests(session.id),
  ]);
  renderDashboard();
  showToast('Appointment cancelled', 'info');
}

function startDashboardRefresh(userId) {
  if (dashboardRefreshTimer) return;

  dashboardRefreshTimer = window.setInterval(async () => {
    if (document.hidden) return;
    try {
      await Promise.all([
        loadUpcomingAppointments(userId),
        loadQueueItems(userId),
        loadBookedLabTests(userId),
        loadPendingLabTests(userId),
      ]);
      renderDashboard();
    } catch (_) {}
  }, 5000);
}
