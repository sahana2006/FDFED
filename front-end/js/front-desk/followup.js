/* ============================================================
   FOLLOWUP.JS - Follow-Up Coordination page logic
   ============================================================ */

const FOLLOWUP_API_BASE_URL = 'http://localhost:3000';

let followUps = [];
let selectedFollowUp = null;
let selectedFollowUpTime = null;

document.addEventListener('DOMContentLoaded', async () => {
  renderShell('followup');

  try {
    await loadFollowUps();
    renderFollowUps(followUps);
  } catch (error) {
    console.error('Follow-up load error:', error);
    showToast('Failed to load follow-ups.', 'error');
  }

  document.getElementById('followup-search').addEventListener('input', function () {
    const query = this.value.trim().toLowerCase();
    if (!query) {
      renderFollowUps(followUps);
      return;
    }

    renderFollowUps(
      followUps.filter((item) =>
        `${item.patientName} ${item.patientPhone || ''} ${item.patientId} ${item.doctorName}`
          .toLowerCase()
          .includes(query),
      ),
    );
  });

  document.getElementById('close-followup-modal').addEventListener('click', closeModal);
  document.getElementById('cancel-followup-modal-btn').addEventListener('click', closeModal);
  document.getElementById('confirm-followup-btn').addEventListener('click', () => void confirmBooking());
});

async function loadFollowUps() {
  const response = await fetch(`${FOLLOWUP_API_BASE_URL}/followups`, {
    headers: { role: 'frontdesk' },
  });

  if (!response.ok) {
    throw new Error('Failed to load follow-ups');
  }

  const records = await response.json();
  followUps = records.map((record) => ({
    id: record.id,
    appointmentId: record.appointmentId || '',
    patientId: record.patientId,
    doctorId: record.doctorId,
    patientName: record.patientName || record.patientId,
    patientPhone: record.patientPhone || '',
    doctorName: record.doctorName,
    doctorNote: record.consultationNote || 'No consultation notes entered.',
    followUpDate: record.followUpDate,
    lastVisit: record.date,
    isReferral: false,
  }));

  const referrals = JSON.parse(localStorage.getItem('referralHistory') || '[]');
  referrals.forEach((ref, index) => {
    if (ref.status === 'Pending') {
      followUps.push({
        id: `ref-${index}`,
        patientId: ref.patientId || 'PAT001',
        doctorId: ref.doctorId || 'DOC002',
        patientName: ref.patient,
        patientPhone: '',
        doctorName: ref.doctor,
        doctorNote: ref.reason || 'Referral reason not provided.',
        followUpDate: ref.date || new Date().toISOString().split('T')[0],
        lastVisit: ref.date,
        isReferral: true,
      });
    }
  });
}

function renderList(items, containerId, emptyId) {
  const container = document.getElementById(containerId);
  const empty = document.getElementById(emptyId);

  if (!items.length) {
    container.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  container.innerHTML = items
    .map(
      (item) => `
        <div class="followup-card followup-card--medium">
          <div class="followup-card-top">
            <div class="followup-patient-name">${item.patientName}</div>
            <div class="followup-doctor-info">${item.isReferral ? 'To: ' + item.doctorName : item.doctorName}</div>
            <div class="followup-last-visit">${item.isReferral ? 'Preferred Date' : 'Suggested Follow-up'}: ${formatDisplayDate(item.followUpDate)}</div>
          </div>

          <div class="doctor-notes-box">
            <span class="notes-badge">${item.isReferral ? 'Referral Reason' : "Doctor's Notes (Read Only)"}</span>
            <div class="notes-text">${item.doctorNote}</div>
          </div>

          <div class="followup-footer" style="justify-content: flex-end;">
            <button class="btn btn-primary btn-sm book-btn" data-id="${item.id}">Book</button>
          </div>
        </div>
      `,
    )
    .join('');

  container.querySelectorAll('.book-btn').forEach((button) => {
    button.addEventListener('click', () => void openFollowUpModal(button.dataset.id));
  });
}

function renderFollowUps(items) {
  const referrals = items.filter(item => item.isReferral);
  const followups = items.filter(item => !item.isReferral);

  renderList(referrals, 'referral-list', 'referral-empty');
  renderList(followups, 'followup-list', 'followup-empty');
}

async function openFollowUpModal(id) {
  selectedFollowUp = followUps.find((item) => item.id === id) || null;
  selectedFollowUpTime = null;
  if (!selectedFollowUp) return;

  const availableSlots = await loadDoctorSlots(
    selectedFollowUp.doctorId,
    selectedFollowUp.followUpDate,
  );

  document.getElementById('followup-modal-body').innerHTML = `
    <div class="followup-modal-info">
      <div class="followup-modal-info-row">
        <span style="color: var(--color-text-secondary);">Patient</span>
        <strong>${selectedFollowUp.patientName}</strong>
      </div>
      <div class="followup-modal-info-row">
        <span style="color: var(--color-text-secondary);">Doctor</span>
        <strong>${selectedFollowUp.doctorName}</strong>
      </div>
      <div class="followup-modal-info-row">
        <span style="color: var(--color-text-secondary);">Suggested Date</span>
        <strong>${formatDisplayDate(selectedFollowUp.followUpDate)}</strong>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Confirm Appointment Date</label>
      <input class="input-field" type="date" id="followup-confirm-date" value="${selectedFollowUp.followUpDate}" />
      <span class="form-error" id="err-followup-date"></span>
    </div>
    <div class="form-group" style="margin-top: var(--space-3);">
      <label class="form-label">Select Time Slot</label>
      <div class="followup-slot-grid" id="followup-slot-grid">
        ${renderFollowUpSlots(availableSlots)}
      </div>
      <span class="form-error" id="err-followup-time"></span>
    </div>
  `;

  bindFollowUpSlotButtons();
  document
    .getElementById('followup-confirm-date')
    .addEventListener('change', async function () {
      selectedFollowUpTime = null;
      const slots = await loadDoctorSlots(selectedFollowUp.doctorId, this.value);
      document.getElementById('followup-slot-grid').innerHTML =
        renderFollowUpSlots(slots);
      bindFollowUpSlotButtons();
    });

  document.getElementById('followup-modal').classList.remove('hidden');
}

async function loadDoctorSlots(doctorId, date) {
  const response = await fetch(
    `${FOLLOWUP_API_BASE_URL}/doctors/${encodeURIComponent(doctorId)}/slots?date=${encodeURIComponent(date)}`,
    {
      headers: { role: 'frontdesk' },
    },
  );

  if (!response.ok) {
    showToast('Unable to load slots.', 'error');
    return [];
  }

  return response.json();
}

function renderFollowUpSlots(slots) {
  if (!slots.length) {
    return '<p class="text-muted">No available slots for this date.</p>';
  }

  return slots
    .map(
      (slot) => `
        <button type="button" class="followup-slot-btn" data-time="${slot}">
          ${slot}
        </button>
      `,
    )
    .join('');
}

function bindFollowUpSlotButtons() {
  document.querySelectorAll('.followup-slot-btn').forEach((button) => {
    button.addEventListener('click', () => {
      selectedFollowUpTime = button.dataset.time;
      document.querySelectorAll('.followup-slot-btn').forEach((item) => {
        item.classList.remove('selected');
      });
      button.classList.add('selected');
      document.getElementById('err-followup-time')?.classList.remove('visible');
    });
  });
}

async function confirmBooking() {
  if (!selectedFollowUp) return;

  const dateInput = document.getElementById('followup-confirm-date');
  const errDate = document.getElementById('err-followup-date');
  const errTime = document.getElementById('err-followup-time');

  if (!dateInput.value.trim()) {
    dateInput.classList.add('error');
    errDate.textContent = 'Please select a date.';
    errDate.classList.add('visible');
    return;
  }

  dateInput.classList.remove('error');
  errDate.classList.remove('visible');

  if (!selectedFollowUpTime) {
    errTime.textContent = 'Please select a time slot.';
    errTime.classList.add('visible');
    return;
  }

  const response = await fetch(`${FOLLOWUP_API_BASE_URL}/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      role: 'frontdesk',
    },
    body: JSON.stringify({
      userId: selectedFollowUp.patientId,
      doctorId: selectedFollowUp.doctorId,
      date: dateInput.value,
      slot: selectedFollowUpTime,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    showToast(payload?.message || 'Unable to book follow-up.', 'error');
    return;
  }

  if (selectedFollowUp.isReferral) {
    const referrals = JSON.parse(localStorage.getItem('referralHistory') || '[]');
    const refIndex = parseInt(selectedFollowUp.id.split('-')[1]);
    if (referrals[refIndex]) {
      referrals[refIndex].status = 'Accepted';
      referrals[refIndex].statusClass = 'badge-confirmed';
      localStorage.setItem('referralHistory', JSON.stringify(referrals));
    }
  }

  await loadFollowUps();
  renderFollowUps(followUps);
  closeModal();
  showToast(
    `Follow-up booked for ${formatDisplayDate(dateInput.value)} at ${selectedFollowUpTime}.`,
  );
}

function closeModal() {
  document.getElementById('followup-modal').classList.add('hidden');
  selectedFollowUp = null;
  selectedFollowUpTime = null;
}

function formatDisplayDate(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
