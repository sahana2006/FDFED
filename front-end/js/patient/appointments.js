/* MEDBITS - appointments.js */

const APPOINTMENTS_API_BASE_URL = 'http://localhost:3000';

let allDoctors = [];
let doctors = [];
let userAppointments = [];
let selectedDoctor = null;
let selectedSlot = null;
let editingAppointment = null;
let editingAppointmentId = null;
let appointmentRefreshTimer = null;

function useTemplate(id) {
  return document.getElementById(id).content.cloneNode(true);
}

async function initializeAppointmentsPage() {
  await Promise.all([loadAllDoctors(), loadUserAppointments()]);
  doctors = allDoctors;
  renderAppointments();
  startAppointmentStatusRefresh();
}

async function fetchAppointmentsApi(url, role) {
  const res = await fetch(url, {
    method: 'GET',
    headers: { role },
    cache: 'no-store',
  });

  console.log(res);

  const payload = await res.json().catch(() => null);
  console.log(payload);

  if (!res.ok) {
    throw new Error('API error');
  }

  return payload;
}

function startAppointmentStatusRefresh() {
  if (appointmentRefreshTimer) return;

  appointmentRefreshTimer = window.setInterval(async () => {
    if (document.hidden) return;
    try {
      await loadUserAppointments();
      refreshApptLists();
    } catch (_) {}
  }, 5000);

  window.addEventListener('focus', async () => {
    try {
      await loadAllDoctors();
      doctors = allDoctors;
      renderSpecializationOptions();
      await loadUserAppointments();
      refreshApptLists();
    } catch (_) {}
  });
}

async function loadAllDoctors() {
  const payload = await fetchAppointmentsApi(
    `${APPOINTMENTS_API_BASE_URL}/doctors`,
    'patient',
  );
  console.log('GET /doctors response (patient):', payload);
  allDoctors = payload.map(normalizeDoctor);
}

async function loadDoctorsBySpecialization(specialization) {
  const payload = await fetchAppointmentsApi(
    `${APPOINTMENTS_API_BASE_URL}/doctors?specialization=${encodeURIComponent(specialization)}`,
    'patient',
  );
  console.log('GET /doctors by specialization response (patient):', payload);
  doctors = payload.map(normalizeDoctor);
}

function normalizeDoctor(doctor) {
  return {
    ...doctor,
    id: doctor.userId || doctor.id,
    userId: doctor.userId || doctor.id,
    slots: Array.isArray(doctor.slots) ? doctor.slots : [],
  };
}

async function loadUserAppointments() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  console.log(user);

  if (!user?.id) {
    throw new Error('Patient session not found');
  }

  return fetch(
    `${APPOINTMENTS_API_BASE_URL}/appointments/user/${encodeURIComponent(user.id)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        role: 'patient',
      },
      cache: 'no-store',
    },
  )
    .then((res) => {
      console.log(res);
      if (!res.ok) throw new Error('API failed');
      return res.json();
    })
    .then((data) => {
      console.log('Appointments:', data);
      userAppointments = data;
      return data;
    })
    .catch((err) => {
      console.error(err);
      throw err;
    });
}

function renderAppointments() {
  selectedDoctor = null;
  selectedSlot = null;
  renderSpecializationOptions();
  renderSpecialtyBrowseCards();
  refreshApptLists();
  document.getElementById('doctorSection').style.display = 'none';
}

function renderSpecializationOptions() {
  const sel = document.getElementById('specSelect');
  const currentValue = sel.value;
  const specializations = [...new Set(allDoctors.map((doctor) => doctor.specialization))];

  sel.innerHTML = '';
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = 'Choose a specialty...';
  sel.appendChild(blank);

  specializations.forEach((specialization) => {
    const opt = document.createElement('option');
    opt.value = specialization;
    opt.textContent = specialization;
    sel.appendChild(opt);
  });

  if (currentValue && specializations.includes(currentValue)) {
    sel.value = currentValue;
  }
}

function renderSpecialtyBrowseCards() {
  const grid = document.getElementById('specialtyBrowseGrid');
  if (!grid) return;

  const specializations = [...new Set(allDoctors.map((doctor) => doctor.specialization))];

  if (!specializations.length) {
    grid.innerHTML = '<p class="text-muted">No specialties available.</p>';
    return;
  }

  grid.innerHTML = specializations
    .map(
      (specialization) => `
        <div class="cat-card" data-spec="${specialization}">
          <div class="cat-icon"><i class="fa-solid fa-user-doctor"></i></div>
          <div class="cat-name">${specialization}</div>
        </div>
      `,
    )
    .join('');

  grid.querySelectorAll('.cat-card').forEach((card) => {
    card.addEventListener('click', () => {
      selectSpeciality(card.dataset.spec);
    });
  });
}

function refreshApptLists() {
  const upcoming = userAppointments.filter((item) => item.status === 'upcoming');
  const past = userAppointments.filter((item) => item.status === 'completed');
  fillApptList('upcomingList', upcoming, false);
  fillApptList('pastList', past, true);
}

function fillApptList(containerId, appointments, isPast) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';

  if (!appointments.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const icon = document.createElement('div');
    icon.className = 'empty-icon';
    icon.textContent = isPast ? '✓' : '...';
    const msg = document.createElement('p');
    msg.textContent = isPast ? 'No past appointments' : 'No upcoming appointments';
    empty.appendChild(icon);
    empty.appendChild(msg);
    el.appendChild(empty);
    return;
  }

  appointments.forEach((appointment) => {
    const frag = useTemplate(isPast ? 'tpl-appt-past' : 'tpl-appt-upcoming');
    const card = frag.querySelector('.list-item');
    card.querySelector('.appt-doctor').textContent = appointment.doctor.name;
    card.querySelector('.appt-info').textContent =
      `${appointment.doctor.specialization} | ${formatDate(appointment.date)} at ${appointment.slot}`;

    if (!isPast) {
      card.querySelector('.appt-edit-btn').onclick = function () {
        void openAppointmentEditModal(appointment.id);
      };
      card.querySelector('.appt-cancel-btn').onclick = function () {
        void cancelAppointment(appointment.id);
      };
    }

    el.appendChild(frag);
  });
}

async function filterDoctors() {
  const specialization = document.getElementById('specSelect').value;
  const section = document.getElementById('doctorSection');

  await loadAllDoctors();
  renderSpecializationOptions();
  document.getElementById('specSelect').value = specialization;

  if (!specialization) {
    section.style.display = 'none';
    return;
  }

  await loadDoctorsBySpecialization(specialization);
  document.getElementById('docSearchWrap').style.display = 'block';
  document.getElementById('docSearchLabel').textContent = `Search ${specialization}s`;
  fillDoctorList(doctors);
  resetSchedulePanel();
  section.style.display = 'block';
}

function resetSchedulePanel() {
  const panel = document.getElementById('schedulePanel');
  panel.innerHTML = '';
  const h = document.createElement('h3');
  h.textContent = 'Schedule Appointment';
  const p = document.createElement('p');
  p.className = 'text-muted';
  p.textContent = 'Click a doctor to see available slots.';
  panel.appendChild(h);
  panel.appendChild(p);
}

function searchDoctors(q) {
  const query = q.trim().toLowerCase();
  const matches = query
    ? doctors.filter((doctor) => doctor.name.toLowerCase().includes(query))
    : doctors;
  fillDoctorList(matches);
}

function fillDoctorList(docs) {
  const list = document.getElementById('docList');
  list.innerHTML = '';

  if (!docs.length) {
    const msg = document.createElement('p');
    msg.className = 'text-muted';
    msg.style.padding = '16px';
    msg.textContent = 'No doctors found.';
    list.appendChild(msg);
    return;
  }

  docs.forEach((doctor) => {
    const frag = useTemplate('tpl-doc-card');
    const card = frag.querySelector('.doc-card');

    card.id = `dcard-${doctor.id}`;
    card.querySelector('.doc-icon').innerHTML = '<i class="fa-solid fa-user-doctor"></i>';
    card.querySelector('.doc-name').textContent = doctor.name;
    card.querySelector('.doc-exp-qual').textContent = doctor.specialization;
    card.querySelector('.doc-hospital').textContent = `${doctor.slots.length} slots available`;
    card.querySelector('.doc-fee').innerHTML = '<i class="fa-regular fa-calendar"></i>';
    card.onclick = function () {
      void selectDoctor(doctor.id);
    };
    card.querySelector('.btn').onclick = function (event) {
      event.stopPropagation();
      void selectDoctor(doctor.id);
    };

    list.appendChild(frag);
  });
}

function selectSpeciality(specialization) {
  document.getElementById('specSelect').value = specialization;
  document.querySelectorAll('.cat-card').forEach((card) => card.classList.remove('active-cat'));
  const chip = document.querySelector(`.cat-card[data-spec="${specialization}"]`);
  if (chip) chip.classList.add('active-cat');
  void filterDoctors();
  document.getElementById('doctorSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function selectDoctor(id) {
  selectedDoctor = doctors.find((doctor) => doctor.id === id) || null;
  if (!selectedDoctor) return;

  selectedSlot = null;
  document.querySelectorAll('.doc-card').forEach((card) => card.classList.remove('selected'));
  const card = document.getElementById(`dcard-${id}`);
  if (card) card.classList.add('selected');

  const frag = useTemplate('tpl-schedule-panel');
  const panel = document.getElementById('schedulePanel');
  panel.innerHTML = '';

  frag.querySelector('.sched-icon').innerHTML = '<i class="fa-solid fa-user-doctor"></i>';
  frag.querySelector('.sched-name').textContent = selectedDoctor.name;
  frag.querySelector('.sched-spec').textContent = selectedDoctor.specialization;

  const dateInput = frag.querySelector('#schedDate');
  dateInput.min = today();
  const preferredDate = val('apptDateSearch');
  dateInput.value = preferredDate || today();
  dateInput.addEventListener('change', function () {
    void loadSlotsForSelectedDoctor(this.value);
  });

  panel.appendChild(frag);
  await loadSlotsForSelectedDoctor(dateInput.value);
}

async function loadSlotsForSelectedDoctor(date) {
  if (!selectedDoctor || !date) return;

  selectedSlot = null;
  const response = await fetch(
    `${APPOINTMENTS_API_BASE_URL}/doctors/${encodeURIComponent(selectedDoctor.id)}/slots?date=${encodeURIComponent(date)}`,
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
  fillSlots(document.getElementById('allSlots'), slots);
}

function fillSlots(container, slots) {
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
    const frag = useTemplate('tpl-slot-btn');
    const btn = frag.querySelector('.slot-btn');
    btn.textContent = slot;
    btn.onclick = function () {
      selectSlot(btn, slot);
    };
    container.appendChild(frag);
  });
}

function selectSlot(btn, slot) {
  document.querySelectorAll('#schedulePanel .slot-btn').forEach((item) => item.classList.remove('selected'));
  btn.classList.add('selected');
  selectedSlot = slot;
}

async function confirmAppointment() {
  const session = requireRole('patient');
  const date = val('schedDate');

  if (!session) return;
  if (!selectedDoctor) {
    showToast('Please select a doctor', 'error');
    return;
  }
  if (!date) {
    showToast('Please select a date', 'error');
    return;
  }
  if (!selectedSlot) {
    showToast('Please pick a time slot', 'error');
    return;
  }

  const response = await fetch(`${APPOINTMENTS_API_BASE_URL}/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      role: 'patient',
    },
    body: JSON.stringify({
      userId: session.id,
      doctorId: selectedDoctor.id,
      date,
      slot: selectedSlot,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    showToast(errorBody?.message || 'Unable to book appointment', 'error');
    return;
  }

  await loadUserAppointments();
  refreshApptLists();
  showToast('Appointment booked!', 'success');
  await loadSlotsForSelectedDoctor(date);
}

async function openAppointmentEditModal(appointmentId) {
  editingAppointment = userAppointments.find(
    (appointment) => appointment.id === appointmentId && appointment.status === 'upcoming',
  ) || null;

  if (!editingAppointment) {
    showToast('Only upcoming appointments can be edited', 'error');
    return;
  }

  editingAppointmentId = appointmentId;
  currentEditId = appointmentId;
  selectedSlot = editingAppointment.slot;

  openModal(`
    <div class="modal-title">Edit Appointment</div>
    <div class="form-group mb-16">
      <label>Doctor</label>
      <input id="editAppointmentDoctor" value="${editingAppointment.doctor.name}" disabled>
    </div>
    <div class="form-group mb-16">
      <label>Date</label>
      <input type="date" id="editAppointmentDate" min="${today()}" value="${editingAppointment.date}">
    </div>
    <div class="form-group mb-16">
      <label>Available Slots</label>
      <div id="editAppointmentSlots" class="slot-grid"></div>
    </div>
    <button class="btn btn-primary btn-full" onclick="saveAppointmentEdit()">Save Changes</button>
  `);

  document.getElementById('editAppointmentDate').addEventListener('change', function () {
    selectedSlot = null;
    void loadEditSlots(this.value);
  });

  await loadEditSlots(editingAppointment.date);
}

async function loadEditSlots(date) {
  if (!editingAppointment || !date) return;

  const response = await fetch(
    `${APPOINTMENTS_API_BASE_URL}/doctors/${encodeURIComponent(editingAppointment.doctorId)}/slots?date=${encodeURIComponent(date)}`,
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
  if (date === editingAppointment.date) {
    displaySlots.add(editingAppointment.slot);
  }

  if (!displaySlots.has(selectedSlot)) {
    selectedSlot = date === editingAppointment.date ? editingAppointment.slot : null;
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
    if (slot === selectedSlot) {
      button.classList.add('selected');
    }
    button.onclick = function () {
      selectedSlot = slot;
      renderEditSlots(slots);
    };
    container.appendChild(button);
  });
}

async function saveAppointmentEdit() {
  if (!editingAppointment || !editingAppointmentId) {
    showToast('No appointment selected', 'error');
    return;
  }

  const date = val('editAppointmentDate');
  if (!date) {
    showToast('Please choose a date', 'error');
    return;
  }

  if (!selectedSlot) {
    showToast('Please choose a slot', 'error');
    return;
  }

  const response = await fetch(
    `${APPOINTMENTS_API_BASE_URL}/appointments/${encodeURIComponent(editingAppointmentId)}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        role: 'patient',
      },
      body: JSON.stringify({
        date,
        slot: selectedSlot,
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    showToast(errorBody?.message || 'Unable to update appointment', 'error');
    return;
  }

  await loadUserAppointments();
  refreshApptLists();
  editingAppointment = null;
  editingAppointmentId = null;
  closeModal();
  showToast('Appointment updated', 'success');
}

async function cancelAppointment(appointmentId) {
  const appointment = userAppointments.find(
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
    `${APPOINTMENTS_API_BASE_URL}/appointments/${encodeURIComponent(appointmentId)}`,
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

  await loadUserAppointments();
  refreshApptLists();
  showToast('Appointment cancelled', 'info');
}
