/* ============================================================
   slot-management.js  — Doctor Slot Management
   All state is persisted in the backend (NestJS).
   ============================================================ */

(async () => {
  await loadComponents('slot-management', 'Slot Management');

  const API_BASE = 'http://localhost:3000';

  // ── Get authenticated doctor from session ──────────────────
  function getDoctorSession() {
    const raw = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;
    if (!user || user.role !== 'doctor') {
      window.location.href = '../login.html';
      return null;
    }
    return user;
  }

  const session = getDoctorSession();
  if (!session) return;

  const DOCTOR_ID = session.id;
  const AUTH_HEADERS = { 'Content-Type': 'application/json', role: 'doctor' };

  // ── State ──────────────────────────────────────────────────
  let currentDate = null;
  let allSlots = [];          // doctor's full slot list
  let slotBlocks = [];        // SlotBlock[] for currentDate
  let unavailDates = [];      // UnavailableDate[] for this doctor
  let bookedAppointments = []; // Appointment[] for currentDate

  // ── Fetch doctor's slots list ───────────────────────────────
  async function loadDoctorSlots() {
    const res = await fetch(`${API_BASE}/doctors/${DOCTOR_ID}`, {
      headers: AUTH_HEADERS,
    });
    if (!res.ok) { showToast('Failed to load doctor profile', 'error'); return; }
    const doctor = await res.json();
    allSlots = doctor.slots || [];
  }

  // ── Fetch slot blocks for current date ─────────────────────
  async function loadSlotBlocks(date) {
    const res = await fetch(
      `${API_BASE}/doctors/${DOCTOR_ID}/slot-blocks?date=${encodeURIComponent(date)}`,
      { headers: AUTH_HEADERS },
    );
    if (!res.ok) { showToast('Failed to load slot blocks', 'error'); return; }
    slotBlocks = await res.json();
  }

  // ── Fetch unavailable dates ────────────────────────────────
  async function loadUnavailableDates() {
    const res = await fetch(
      `${API_BASE}/doctors/${DOCTOR_ID}/unavailable-dates`,
      { headers: AUTH_HEADERS },
    );
    if (!res.ok) { showToast('Failed to load unavailable dates', 'error'); return; }
    unavailDates = await res.json();
  }

  // ── Fetch doctor's appointments for a specific date ─────────
  async function loadAppointmentsForDate(date) {
    const res = await fetch(
      `${API_BASE}/doctors/${DOCTOR_ID}/appointments`,
      { headers: AUTH_HEADERS },
    );
    if (!res.ok) { bookedAppointments = []; return; }
    const all = await res.json();
    // Keep only upcoming appointments on this date
    bookedAppointments = all.filter(
      (a) => a.date === date && a.status === 'upcoming',
    );
  }

  // ── Render slot grid for the selected date ─────────────────
  async function renderSlots() {
    const grid = document.getElementById('slotGrid');
    const hasDate = Boolean(currentDate);

    grid.classList.toggle('is-disabled', !hasDate);
    grid.innerHTML = '';

    if (!hasDate) return;

    // Check if the whole date is unavailable
    const dateIsUnavailable = unavailDates.some((u) => u.date === currentDate);

    // Build a map: slot → appointment (for booked slots)
    const bookedSlotMap = new Map(
      bookedAppointments.map((a) => [a.slot, a]),
    );

    allSlots.forEach((slot) => {
      const block = slotBlocks.find((b) => b.slot === slot);
      const appointment = bookedSlotMap.get(slot);
      const isBlocked  = Boolean(block);
      const isBooked   = Boolean(appointment); // patient already reserved

      let cssClass   = 'available';
      let statusLabel = 'Available';
      let patientLine = '';
      let clickable   = !dateIsUnavailable;

      if (dateIsUnavailable) {
        cssClass    = 'unavailable';
        statusLabel = 'Day Off';
        clickable   = false;
      } else if (isBooked) {
        // Patient-booked — show warning yellow, not clickable
        cssClass    = 'patient-booked';
        statusLabel = 'Already Booked';
        const patientName =
          appointment.patient?.name ||
          `${appointment.patient?.firstName || ''} ${appointment.patient?.lastName || ''}`.trim() ||
          appointment.userId;
        patientLine = `<div class="slot-patient" title="${patientName}">👤 ${patientName}</div>`;
        clickable   = false;
      } else if (isBlocked) {
        cssClass    = 'unavailable';
        statusLabel = 'Blocked';
        clickable   = true; // doctor can unblock
      }

      const div = document.createElement('div');
      div.className = `slot-item ${cssClass}`;
      div.innerHTML = `
        <div class="slot-time">${slot}</div>
        <div class="slot-status">${statusLabel}</div>
        ${patientLine}
      `;

      if (clickable) {
        if (isBlocked) {
          div.title = `Click to unblock${block.reason ? ` — ${block.reason}` : ''}`;
        } else {
          div.title = 'Click to block this slot';
        }
        div.style.cursor = 'pointer';
        div.addEventListener('click', () => toggleSlotBlock(slot, block));
      } else if (isBooked) {
        div.title = `Booked by ${patientLine ? patientLine.replace(/<[^>]+>/g, '').trim() : 'patient'} — cancel the appointment to block this slot`;
      }

      grid.appendChild(div);
    });
  }

  // ── Toggle block/unblock for a single slot ─────────────────
  async function toggleSlotBlock(slot, existingBlock) {
    if (existingBlock) {
      // Unblock
      const res = await fetch(
        `${API_BASE}/doctors/${DOCTOR_ID}/slot-blocks/${existingBlock.id}`,
        { method: 'DELETE', headers: AUTH_HEADERS },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        showToast(err?.message || 'Failed to unblock slot', 'error');
        return;
      }
      showToast(`Slot ${slot} unblocked`, 'success');
    } else {
      // Block — optionally prompt for reason
      const reason = window.prompt(
        `Block slot ${slot} on ${currentDate}?\nEnter a reason (optional):`,
        '',
      );
      if (reason === null) return; // user cancelled

      const res = await fetch(
        `${API_BASE}/doctors/${DOCTOR_ID}/slot-blocks`,
        {
          method: 'POST',
          headers: AUTH_HEADERS,
          body: JSON.stringify({ date: currentDate, slot, reason: reason.trim() || undefined }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        showToast(err?.message || 'Failed to block slot', 'error');
        return;
      }
      showToast(`Slot ${slot} blocked`, 'success');
    }

    await loadSlotBlocks(currentDate);
    await renderSlots();
    await renderWeeklyOverview();
  }

  // ── Date picker change ─────────────────────────────────────
  document.getElementById('slotDate').addEventListener('change', async function () {
    const val = this.value;
    const label = document.getElementById('slotDateLabel');
    const saveBtn = document.getElementById('saveSlotBtn');

    if (!val) {
      currentDate       = null;
      slotBlocks        = [];
      bookedAppointments = [];
      label.textContent = 'Choose a date to start managing availability.';
      if (saveBtn) saveBtn.style.display = 'none';
      await renderSlots();
      return;
    }

    currentDate = val;
    const d = new Date(`${val}T00:00:00`);
    label.textContent = d.toLocaleDateString('en-GB', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    });
    if (saveBtn) saveBtn.style.display = 'none';

    // Load all three data sources in parallel
    await Promise.all([
      loadSlotBlocks(val),
      loadAppointmentsForDate(val),
    ]);
    await renderSlots();
  });

  // Hide legacy save button
  const saveBtn = document.getElementById('saveSlotBtn');
  if (saveBtn) saveBtn.style.display = 'none';

  // ── Unavailable Dates section ──────────────────────────────
  async function renderUnavailableTags() {
    const container = document.getElementById('unavailableList');
    container.innerHTML = '';

    if (!unavailDates.length) {
      container.innerHTML = '<span style="color:var(--text-secondary,#888);font-size:.875rem;">No dates marked unavailable.</span>';
      return;
    }

    unavailDates.forEach((entry) => {
      const tag = document.createElement('span');
      tag.className = 'unavail-tag';

      const d = new Date(`${entry.date}T00:00:00`);
      const label = d.toLocaleDateString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });

      tag.innerHTML = `${label} <button data-id="${entry.id}" aria-label="Remove ${label}">&times;</button>`;
      tag.querySelector('button').addEventListener('click', async () => {
        const res = await fetch(
          `${API_BASE}/doctors/${DOCTOR_ID}/unavailable-dates/${entry.id}`,
          { method: 'DELETE', headers: AUTH_HEADERS },
        );
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          showToast(err?.message || 'Failed to remove date', 'error');
          return;
        }
        showToast(`${label} removed from unavailable dates`, 'success');
        await loadUnavailableDates();
        renderUnavailableTags();
        if (currentDate === entry.date) await renderSlots();
        await renderWeeklyOverview();
      });

      container.appendChild(tag);
    });
  }

  document.getElementById('markUnavailableBtn').addEventListener('click', async () => {
    const input = document.getElementById('unavailableDate');
    const val = input.value;
    if (!val) {
      showToast('Please select a date.', 'error');
      return;
    }

    const res = await fetch(
      `${API_BASE}/leave-requests`,
      {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({ doctorId: DOCTOR_ID, date: val, type: 'Casual', reason: 'Requested via portal' }),
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      showToast(err?.message || 'Failed to submit leave request', 'error');
      return;
    }

    const d = new Date(`${val}T00:00:00`);
    const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    showToast(`Leave request for ${label} submitted to admin`, 'success');
    input.value = '';
  });

  // ── Weekly Overview ────────────────────────────────────────
  async function renderWeeklyOverview() {
    const grid = document.getElementById('weekGrid');
    if (!grid) return;

    const res = await fetch(
      `${API_BASE}/doctors/${DOCTOR_ID}/weekly-availability`,
      { headers: AUTH_HEADERS },
    );
    if (!res.ok) return;

    const week = await res.json();
    grid.innerHTML = '';

    week.forEach((day) => {
      const card = document.createElement('div');
      card.className = 'day-card';
      if (day.isUnavailable) card.classList.add('unavailable');

      const today = new Date().toISOString().split('T')[0];
      if (day.date === today) card.classList.add('today');

      card.innerHTML = `
        <div class="day-name">${day.dayName}</div>
        <div class="day-date" style="font-size:.72rem;color:var(--text-secondary,#888);margin-bottom:4px;">${day.date}</div>
        <div class="day-slots">
          ${day.isUnavailable
            ? '<span style="color:#ef4444;font-weight:600;">Day Off</span>'
            : `<span style="color:var(--primary,#6366f1);font-weight:600;">${day.availableSlots}</span>/<span>${day.totalSlots}</span> slots`
          }
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // ── Legend — update to show all 4 states ──────────────────
  function renderLegend() {
    const legend = document.querySelector('.slot-legend');
    if (!legend) return;
    legend.innerHTML = `
      <div class="legend-item"><span class="legend-dot available-dot"></span>Available</div>
      <div class="legend-item"><span class="legend-dot patient-booked-dot"></span>Patient Booked</div>
      <div class="legend-item"><span class="legend-dot unavailable" style="width:14px;height:14px;border-radius:4px;background:#fee2e2;border:1.5px solid #ef4444;display:inline-block;"></span>Blocked / Day Off</div>
    `;
  }

  // ── Init ───────────────────────────────────────────────────
  await loadDoctorSlots();
  await loadUnavailableDates();
  renderUnavailableTags();
  renderLegend();
  await renderSlots();
  await renderWeeklyOverview();
})();
