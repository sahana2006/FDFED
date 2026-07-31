/* ============================================================
   APPOINTMENTS.JS - Front desk appointment flow
   ============================================================ */

const APPOINTMENTS_API_BASE_URL = 'http://localhost:3000';

let allPatients = [];
let allDoctors = [];
let allSpecialties = [];
let appointments = [];
let selectedSpecialty = null;
let selectedDoctor = null;
let selectedSlot = null;
let selectedDate = null;
let currentDateOffset = 0;
let pendingCancelId = null;
let showAllConsultations = false;
let activeModifyId = null;
let modifyAppointment = null;
let appointmentRefreshTimer = null;

async function fetchAppointmentsApi(url, role) {
  const res = await fetch(url, {
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

document.addEventListener('DOMContentLoaded', async () => {
  renderShell('appointments');

  try {
    await initializeAppointmentsPage();
  } catch (error) {
    console.error('Frontdesk appointments init error:', error);
    showToast('Failed to load appointments.', 'error');
    return;
  }

  document.getElementById('new-appointment-btn').addEventListener('click', () => {
    void openNewAppointmentFlow();
  });

  document
    .getElementById('back-to-patient-btn')
    .addEventListener('click', () => goToStep('patient'));
  document
    .getElementById('back-to-specialty-btn')
    .addEventListener('click', () => goToStep('specialty'));
  document
    .getElementById('back-to-doctor-btn')
    .addEventListener('click', () => goToStep('doctor'));

  document
    .getElementById('specialty-search-input')
    .addEventListener('input', function () {
      const query = this.value.toLowerCase();
      renderSpecialties(
        allSpecialties.filter((specialty) =>
          specialty.name.toLowerCase().includes(query),
        ),
      );
    });

  document
    .getElementById('doctor-search-input')
    .addEventListener('input', function () {
      const query = this.value.toLowerCase();
      if (!selectedSpecialty) return;

      renderDoctors(
        allDoctors.filter(
          (doctor) =>
            doctor.specialization === selectedSpecialty.name &&
            doctor.name.toLowerCase().includes(query),
        ),
      );
    });

  document.getElementById('prev-dates-btn').addEventListener('click', () => {
    if (currentDateOffset > 0) {
      currentDateOffset -= 1;
      renderDateStrip();
    }
  });

  document.getElementById('next-dates-btn').addEventListener('click', () => {
    currentDateOffset += 1;
    renderDateStrip();
  });

  document
    .getElementById('confirm-appointment-btn')
    .addEventListener('click', () => void confirmAppointment());

  document.getElementById('close-modify-modal').addEventListener('click', closeModifyModal);
  document.getElementById('cancel-modify-btn').addEventListener('click', closeModifyModal);
  document.getElementById('close-cancel-modal').addEventListener('click', closeCancelModal);
  document.getElementById('abort-cancel-btn').addEventListener('click', closeCancelModal);
  document
    .getElementById('confirm-cancel-btn')
    .addEventListener('click', () => void confirmCancelAppointment());
  document
    .getElementById('save-modify-btn')
    .addEventListener('click', () => void saveModifiedAppointment());

  setupPatientSearch();
  setupConsultationToggle();
  startAppointmentsRefresh();
});

async function initializeAppointmentsPage() {
  await Promise.all([
    loadPatients(),
    loadDoctors(),
    loadUpcomingAppointments(),
  ]);

  const savedPatient = getSelectedPatient();
  if (savedPatient?.userId) {
    const currentPatient =
      allPatients.find((patient) => patient.userId === savedPatient.userId) ||
      upsertPatientRecord(savedPatient);
    showSelectedPatient(currentPatient);
  }

  renderUpcomingConsultations();
}

function startAppointmentsRefresh() {
  if (appointmentRefreshTimer) return;

  appointmentRefreshTimer = window.setInterval(async () => {
    if (document.hidden) return;
    try {
      await loadUpcomingAppointments();
      renderUpcomingConsultations();
    } catch (_) {}
  }, 5000);

  window.addEventListener('focus', async () => {
    try {
      await loadDoctors();
      await loadUpcomingAppointments();
      renderUpcomingConsultations();
    } catch (_) {}
  });
}

async function openNewAppointmentFlow() {
  try {
    await loadDoctors();
  } catch (error) {
    showToast('Failed to load doctors.', 'error');
    return;
  }

  selectedSpecialty = null;
  selectedDoctor = null;
  selectedSlot = null;
  selectedDate = null;
  goToStep('specialty');
  renderSpecialties(allSpecialties);
}

async function loadPatients() {
  const data = await fetchAppointmentsApi(
    `${APPOINTMENTS_API_BASE_URL}/patients`,
    'frontdesk',
  );
  allPatients = data.map(normalizePatientRecord);
}

function normalizePatientRecord(patient) {
  const userId = patient.userId || patient.id || patient.patientId;

  return {
    ...patient,
    id: userId,
    userId,
    patientId: userId,
    name:
      patient.name ||
      `${patient.firstName || ''} ${patient.lastName || ''}`.trim() ||
      userId,
    guardian: patient.guardianName,
    age: calculateAgeFromIso(patient.dob),
  };
}

function upsertPatientRecord(patient) {
  const normalizedPatient = normalizePatientRecord(patient);
  const existingIndex = allPatients.findIndex(
    (currentPatient) => currentPatient.userId === normalizedPatient.userId,
  );

  if (existingIndex === -1) {
    allPatients.unshift(normalizedPatient);
  } else {
    allPatients[existingIndex] = normalizedPatient;
  }

  return normalizedPatient;
}

async function loadDoctors() {
  const payload = await fetchAppointmentsApi(
    `${APPOINTMENTS_API_BASE_URL}/doctors`,
    'frontdesk',
  );
  console.log('GET /doctors response (frontdesk appointments):', payload);
  allDoctors = payload.map(normalizeDoctor);
  allSpecialties = [...new Set(allDoctors.map((doctor) => doctor.specialization))]
    .sort()
    .map((name) => ({
      id: name,
      name,
      icon: name.toLowerCase(),
    }));
}

function normalizeDoctor(doctor) {
  return {
    ...doctor,
    id: doctor.userId || doctor.id,
    userId: doctor.userId || doctor.id,
    slots: Array.isArray(doctor.slots) ? doctor.slots : [],
  };
}

async function loadUpcomingAppointments() {
  appointments = await fetchAppointmentsApi(
    `${APPOINTMENTS_API_BASE_URL}/appointments`,
    'frontdesk',
  );
}

function goToStep(step) {
  document.querySelectorAll('.appt-step').forEach((element) => {
    element.classList.add('hidden');
  });
  document.getElementById(`step-${step}`).classList.remove('hidden');
}

function setupPatientSearch() {
  const input = document.getElementById('appt-patient-search');
  const results = document.getElementById('appt-search-results');

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      results.classList.add('hidden');
      return;
    }

    const matches = allPatients.filter((patient) => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      return (
        patient.phone.includes(query) ||
        patient.userId.toLowerCase().includes(query) ||
        fullName.includes(query)
      );
    });

    if (!matches.length) {
      results.innerHTML = `
        <div class="search-result-item search-result-item-empty">
          <div class="search-result-info">
            <span class="search-result-name">No patients found</span>
            <span class="search-result-meta">Try a phone number, patient ID, or full name.</span>
          </div>
        </div>
      `;
    } else {
      results.innerHTML = matches
        .map(
          (patient) => `
            <div class="search-result-item" data-id="${patient.userId}">
              <div class="search-result-info">
                <span class="search-result-name">${patient.firstName} ${patient.lastName}</span>
                <span class="search-result-meta">${patient.age} ${getGenderShort(patient.gender)} | ${patient.phone}</span>
              </div>
              <span class="search-result-id">${patient.userId}</span>
            </div>
          `,
        )
        .join('');

      results.querySelectorAll('.search-result-item[data-id]').forEach((item) => {
        item.addEventListener('click', () => {
          const patient = allPatients.find(
            (currentPatient) => currentPatient.userId === item.dataset.id,
          );
          if (!patient) return;
          setSelectedPatient(patient);
          showSelectedPatient(patient);
          results.classList.add('hidden');
          input.value = '';
        });
      });
    }

    results.classList.remove('hidden');
  });

  document.addEventListener('click', (event) => {
    if (!results.contains(event.target) && event.target !== input) {
      results.classList.add('hidden');
    }
  });
}

function showSelectedPatient(patient) {
  const badge = document.getElementById('selected-patient-badge');
  document.getElementById('selected-patient-name').textContent =
    `${patient.firstName} ${patient.lastName} - ${patient.userId}`;
  badge.classList.remove('hidden');

  document.getElementById('clear-patient-btn').onclick = () => {
    setSelectedPatient(null);
    badge.classList.add('hidden');
  };
}

function renderUpcomingConsultations() {
  const container = document.getElementById('upcoming-consultations');
  const toggleButton = document.getElementById('toggle-consultations-btn');

  if (!appointments.length) {
    container.innerHTML = '<div class="empty-state"><p>No upcoming consultations</p></div>';
    toggleButton.classList.add('hidden');
    return;
  }

  const visibleAppointments = showAllConsultations
    ? appointments
    : appointments.slice(0, 5);

  toggleButton.classList.toggle('hidden', appointments.length <= 5);
  toggleButton.textContent = showAllConsultations ? 'Show Less' : 'View All';

  container.innerHTML = visibleAppointments
    .map((appointment) => {
      const patientName =
        appointment.patient?.name ||
        `${appointment.patient?.firstName || ''} ${appointment.patient?.lastName || ''}`.trim() ||
        appointment.userId;
      const patientAge = appointment.patient?.dob
        ? calculateAgeFromIso(appointment.patient.dob)
        : '';
      const patientGender = getGenderShort(appointment.patient?.gender || '');

      return `
        <div class="consultation-item">
          <div class="consultation-info">
            <span class="consultation-patient">${patientName}${patientAge ? ` - ${patientAge}${patientGender}` : ''}</span>
            <span class="consultation-meta">${formatAppointmentDate(appointment.date)} | ${appointment.doctor.name} | ${appointment.slot}</span>
          </div>
          <div class="consultation-actions">
            <button class="btn btn-modify btn-sm modify-btn" data-id="${appointment.id}">Modify</button>
            <button class="btn btn-danger btn-sm cancel-btn" data-id="${appointment.id}">Cancel</button>
          </div>
        </div>
      `;
    })
    .join('');

  container.querySelectorAll('.modify-btn').forEach((button) => {
    button.addEventListener('click', () => void openModifyModal(button.dataset.id));
  });

  container.querySelectorAll('.cancel-btn').forEach((button) => {
    button.addEventListener('click', () => openCancelModal(button.dataset.id));
  });
}

function setupConsultationToggle() {
  const toggleButton = document.getElementById('toggle-consultations-btn');
  if (!toggleButton) return;

  toggleButton.addEventListener('click', () => {
    showAllConsultations = !showAllConsultations;
    renderUpcomingConsultations();
  });
}

function renderSpecialties(specialties) {
  const grid = document.getElementById('specialty-grid');
  if (!specialties.length) {
    grid.innerHTML = '<div class="empty-state"><p>No specialties found</p></div>';
    return;
  }

  grid.innerHTML = specialties
    .map(
      (specialty) => `
        <div class="specialty-card" data-id="${specialty.id}">
          <div class="specialty-icon">${getSpecialtyIcon(specialty.icon)}</div>
          <span class="specialty-name">${specialty.name}</span>
        </div>
      `,
    )
    .join('');

  grid.querySelectorAll('.specialty-card').forEach((card) => {
    card.addEventListener('click', () => {
      selectedSpecialty = allSpecialties.find(
        (specialty) => specialty.id === card.dataset.id,
      );
      setSelectedSpecialty(selectedSpecialty);
      document.getElementById('selected-specialty-label').textContent =
        selectedSpecialty.name;
      renderDoctors(
        allDoctors.filter(
          (doctor) => doctor.specialization === selectedSpecialty.name,
        ),
      );
      goToStep('doctor');
    });
  });
}

function renderDoctors(doctors) {
  const grid = document.getElementById('doctor-grid');
  if (!doctors.length) {
    grid.innerHTML = '<div class="empty-state"><p>No doctors found</p></div>';
    return;
  }

  grid.innerHTML = doctors
    .map(
      (doctor) => `
        <div class="doctor-card" data-id="${doctor.id}">
          <div class="doctor-info">
            <span class="doctor-name">${doctor.name}</span>
            <span class="doctor-specialty">${doctor.specialization}</span>
          </div>
          <button class="btn btn-primary btn-sm">Select Slot</button>
        </div>
      `,
    )
    .join('');

  grid.querySelectorAll('.doctor-card').forEach((card) => {
    card.querySelector('button').addEventListener('click', () => {
      selectedDoctor =
        allDoctors.find((doctor) => doctor.id === card.dataset.id) || null;
      if (!selectedDoctor) return;

      setSelectedDoctor(selectedDoctor);
      document.getElementById('slot-doctor-name').textContent = selectedDoctor.name;
      document.getElementById('slot-doctor-spec').textContent =
        selectedDoctor.specialization;
      currentDateOffset = 0;
      selectedDate = null;
      selectedSlot = null;
      renderDateStrip();
      goToStep('slot');
    });
  });
}

function renderDateStrip() {
  const strip = document.getElementById('date-strip');
  const baseDate = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  let html = '';
  for (let index = 0; index < 7; index += 1) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + currentDateOffset + index);
    const isoDate = date.toISOString().split('T')[0];
    const isSelected = isoDate === selectedDate;

    html += `
      <div class="date-chip ${isSelected ? 'selected' : ''}" data-date="${isoDate}">
        <span class="date-day-name">${days[date.getDay()]}</span>
        <span class="date-day-num">${date.getDate()}</span>
        <span class="date-month">${months[date.getMonth()]}</span>
      </div>
    `;
  }

  strip.innerHTML = html;

  strip.querySelectorAll('.date-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      selectedDate = chip.dataset.date;
      selectedSlot = null;
      renderDateStrip();
      void renderSlots();
    });
  });

  if (!selectedDate) {
    const firstChip = strip.querySelector('.date-chip');
    if (firstChip) {
      selectedDate = firstChip.dataset.date;
      firstChip.classList.add('selected');
      void renderSlots();
    }
  }
}

async function renderSlots() {
  if (!selectedDoctor || !selectedDate) return;

  const response = await fetch(
    `${APPOINTMENTS_API_BASE_URL}/doctors/${encodeURIComponent(selectedDoctor.id)}/slots?date=${encodeURIComponent(selectedDate)}`,
    {
      headers: { role: 'frontdesk' },
    },
  );

  if (!response.ok) {
    showToast('Unable to load slots.', 'error');
    return;
  }

  const slots = await response.json();
  const groupedSlots = {
    morning: [],
    afternoon: [],
    evening: [],
  };

  slots.forEach((slot) => {
    const hour = Number(slot.split(':')[0] || 0);
    if (hour < 12) {
      groupedSlots.morning.push(slot);
    } else if (hour < 16) {
      groupedSlots.afternoon.push(slot);
    } else {
      groupedSlots.evening.push(slot);
    }
  });

  renderSlotGroup('slots-morning', groupedSlots.morning);
  renderSlotGroup('slots-afternoon', groupedSlots.afternoon);
  renderSlotGroup('slots-evening', groupedSlots.evening);
}

function renderSlotGroup(containerId, slots) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!slots.length) {
    container.innerHTML = '<p class="text-muted">No slots available.</p>';
    return;
  }

  container.innerHTML = slots
    .map(
      (slot) => `
        <button class="slot-btn ${slot === selectedSlot ? 'selected' : ''}" data-time="${slot}">
          ${slot}
        </button>
      `,
    )
    .join('');

  container.querySelectorAll('.slot-btn').forEach((button) => {
    button.addEventListener('click', () => {
      selectedSlot = button.dataset.time;
      document
        .querySelectorAll('.slot-btn')
        .forEach((slotButton) => slotButton.classList.remove('selected'));
      button.classList.add('selected');
    });
  });
}

async function confirmAppointment() {
  const patient = getSelectedPatient();
  if (!patient?.userId) {
    showToast('Please select a patient first.', 'error');
    goToStep('patient');
    return;
  }

  if (!selectedDoctor || !selectedDate || !selectedSlot) {
    showToast('Please choose doctor, date and slot.', 'error');
    return;
  }

  const response = await fetch(`${APPOINTMENTS_API_BASE_URL}/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      role: 'frontdesk',
    },
    body: JSON.stringify({
      userId: patient.userId,
      doctorId: selectedDoctor.id,
      date: selectedDate,
      slot: selectedSlot,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    showToast(payload?.message || 'Unable to book appointment.', 'error');
    return;
  }

  appointments.unshift(payload);
  renderUpcomingConsultations();
  await loadUpcomingAppointments();
  renderUpcomingConsultations();

  selectedSlot = null;
  selectedDate = null;
  goToStep('patient');
  showToast(`Appointment booked for ${selectedDoctor.name}.`);
}

async function openModifyModal(appointmentId) {
  modifyAppointment =
    appointments.find(
      (appointment) =>
        appointment.id === appointmentId && appointment.status === 'upcoming',
    ) || null;

  if (!modifyAppointment) {
    showToast('Only upcoming appointments can be modified.', 'error');
    return;
  }

  activeModifyId = appointmentId;
  document.getElementById('modify-modal-body').innerHTML = `
    <div class="modify-modal-content">
      <div class="modify-hero">
        <div class="modify-hero-copy">
          <span class="badge badge-purple">Upcoming</span>
          <h3>${modifyAppointment.patient?.name || modifyAppointment.userId}</h3>
          <p>${modifyAppointment.doctor.name}</p>
        </div>
        <div class="modify-hero-meta">
          <span>Current Slot</span>
          <strong>${modifyAppointment.slot}</strong>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group full-width">
          <label class="form-label">Doctor</label>
          <input class="input-field" value="${modifyAppointment.doctor.name}" readonly />
        </div>
        <div class="form-group">
          <label class="form-label" for="modify-date">Date</label>
          <input class="input-field" id="modify-date" type="date" value="${modifyAppointment.date}" min="${todayIso()}" />
        </div>
        <div class="form-group">
          <label class="form-label">Available Slots</label>
          <div id="modify-slot-list" class="slot-row"></div>
        </div>
      </div>
    </div>
  `;

  selectedSlot = modifyAppointment.slot;
  document
    .getElementById('modify-date')
    .addEventListener('change', () => void renderModifySlots());
  await renderModifySlots();
  document.getElementById('modify-modal').classList.remove('hidden');
}

async function renderModifySlots() {
  if (!modifyAppointment) return;

  const date = document.getElementById('modify-date').value;
  const response = await fetch(
    `${APPOINTMENTS_API_BASE_URL}/doctors/${encodeURIComponent(modifyAppointment.doctorId)}/slots?date=${encodeURIComponent(date)}`,
    {
      headers: { role: 'frontdesk' },
    },
  );

  if (!response.ok) {
    showToast('Unable to load slots.', 'error');
    return;
  }

  const slots = await response.json();
  const slotSet = new Set(slots);
  if (date === modifyAppointment.date) {
    slotSet.add(modifyAppointment.slot);
  }

  const container = document.getElementById('modify-slot-list');
  const visibleSlots = Array.from(slotSet);

  if (!visibleSlots.length) {
    container.innerHTML = '<p class="text-muted">No slots available.</p>';
    return;
  }

  if (!slotSet.has(selectedSlot)) {
    selectedSlot = date === modifyAppointment.date ? modifyAppointment.slot : null;
  }

  container.innerHTML = visibleSlots
    .map(
      (slot) => `
        <button type="button" class="slot-btn ${slot === selectedSlot ? 'selected' : ''}" data-slot="${slot}">
          ${slot}
        </button>
      `,
    )
    .join('');

  container.querySelectorAll('.slot-btn').forEach((button) => {
    button.addEventListener('click', () => {
      selectedSlot = button.dataset.slot;
      renderModifySlots();
    });
  });
}

async function saveModifiedAppointment() {
  if (!activeModifyId || !modifyAppointment) return;

  const date = document.getElementById('modify-date').value;
  if (!date || !selectedSlot) {
    showToast('Please select date and slot.', 'error');
    return;
  }

  const response = await fetch(
    `${APPOINTMENTS_API_BASE_URL}/appointments/${encodeURIComponent(activeModifyId)}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        role: 'frontdesk',
      },
      body: JSON.stringify({
        date,
        slot: selectedSlot,
      }),
    },
  );

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    showToast(payload?.message || 'Unable to update appointment.', 'error');
    return;
  }

  await loadUpcomingAppointments();
  renderUpcomingConsultations();
  closeModifyModal();
  showToast('Appointment updated successfully.');
}

function openCancelModal(id) {
  const appointment = appointments.find((item) => item.id === id);
  if (!appointment) return;

  pendingCancelId = id;
  document.getElementById('cancel-modal-body').innerHTML = `
    <strong>${appointment.patient?.name || appointment.userId}</strong><br/>
    ${appointment.doctor.name} - ${appointment.slot}
  `;
  document.getElementById('cancel-modal').classList.remove('hidden');
}

async function confirmCancelAppointment() {
  if (!pendingCancelId) return;

  const response = await fetch(
    `${APPOINTMENTS_API_BASE_URL}/appointments/${encodeURIComponent(pendingCancelId)}`,
    {
      method: 'DELETE',
      headers: { role: 'frontdesk' },
    },
  );

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    showToast(payload?.message || 'Unable to cancel appointment.', 'error');
    return;
  }

  pendingCancelId = null;
  closeCancelModal();
  await loadUpcomingAppointments();
  renderUpcomingConsultations();
  showToast('Appointment cancelled successfully.');
}

function closeModifyModal() {
  document.getElementById('modify-modal').classList.add('hidden');
  activeModifyId = null;
  modifyAppointment = null;
}

function closeCancelModal() {
  document.getElementById('cancel-modal').classList.add('hidden');
}

function formatAppointmentDate(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function calculateAgeFromIso(dob) {
  if (!dob) return '';
  const birth = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return '';

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }
  return age;
}

function getGenderShort(gender) {
  if (!gender) return '';
  return gender.trim().charAt(0).toUpperCase();
}

function todayIso() {
  return new Date().toISOString().split('T')[0];
}
