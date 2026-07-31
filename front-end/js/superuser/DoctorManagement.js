const API_BASE_URL = 'http://localhost:3000';

window.DoctorStore = {
    doctors: [],
    async load() {
        const response = await fetch(`${API_BASE_URL}/doctors`, {
            headers: { role: getCurrentRole() },
        });
        if (!response.ok) throw new Error(await getErrorMessage(response));
        const payload = await response.json();
        console.log('GET /doctors response (admin):', payload);
        this.doctors = payload.map(normalizeDoctor);
        return this.doctors;
    },
    getAll() { return this.doctors; },
    getById(id) { return this.doctors.find(d => d.userId === id || d.id === id) || null; },
    async add(doctor) {
        const response = await fetch(`${API_BASE_URL}/doctors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', role: getCurrentRole() },
            body: JSON.stringify(doctor),
        });
        if (!response.ok) throw new Error(await getErrorMessage(response));
        const created = normalizeDoctor(await response.json());
        await this.load();
        return created;
    },
    async update(userId, updates) {
        const response = await fetch(`${API_BASE_URL}/doctors/${encodeURIComponent(userId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', role: getCurrentRole() },
            body: JSON.stringify(updates),
        });
        if (!response.ok) throw new Error(await getErrorMessage(response));
        const updated = normalizeDoctor(await response.json());
        await this.load();
        return updated;
    },
    search(query) {
        const q = query.trim().toLowerCase();
        return !q ? this.getAll() : this.getAll().filter(d =>
            d.name.toLowerCase().includes(q) ||
            d.department.toLowerCase().includes(q) ||
            d.specialization.toLowerCase().includes(q) ||
            d.phone.includes(q)
        );
    },
    fullName: doctor => doctor.name,
};

const PAGES = ['page-view-doctor', 'page-view-all-doctor', 'page-add-doctor', 'page-edit-doctor'];
const DETAIL_FIELDS = {
    'detail-personal': [['name', 'Doctor Name'], ['userId', 'User ID'], ['email', 'E-Mail Id'], ['gender', 'Gender'], ['phone', 'Contact No']],
    'detail-employment': [['specialization', 'Specialization'], ['qualification', 'Qualification'], ['department', 'Department'], ['experienceLabel', 'Experience']],
    'detail-availability': [['slotsLabel', 'Slots']],
};
const FORM_FIELDS = ['firstName', 'lastName', 'specialization', 'qualification', 'department'];
const formState = { add: false, edit: false };
let currentDoctorId = null;
let editDoctorId = null;

const $ = id => document.getElementById(id);
const setInvalid = (el, invalid) => el && el.classList.toggle('invalid', invalid);
const removeEditDropdown = () => $('mb-search-dropdown')?.remove();

function getCurrentRole() {
    try {
        return JSON.parse(localStorage.getItem('user'))?.role || 'admin';
    } catch {
        return 'admin';
    }
}

async function getErrorMessage(response) {
    const body = await response.json().catch(() => null);
    return Array.isArray(body?.message) ? body.message.join(', ') : body?.message || 'Request failed.';
}

function normalizeDoctor(doctor) {
    const [firstName = '', ...rest] = (doctor.name || '').replace(/^Dr\.\s*/i, '').split(' ');
    const experience = Number(doctor.experience) || 0;
    const slots = Array.isArray(doctor.slots) ? doctor.slots : [];
    return {
        ...doctor,
        id: doctor.id || doctor.userId,
        userId: doctor.userId || doctor.id,
        firstName,
        lastName: rest.join(' '),
        department: doctor.department || '',
        specialization: doctor.specialization || '',
        phone: doctor.phone || '',
        contact: doctor.phone || '',
        experience,
        experienceLabel: `${experience} year(s)`,
        slots,
        slotsLabel: slots.join(', ') || '-',
    };
}

const formatTime = value => {
    if (!value) return '';
    const [h, m] = value.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

function showToast(message, type = 'success') {
    const existing = $('mb-toast');
    if (existing) existing.remove();
    const toast = Object.assign(document.createElement('div'), { id: 'mb-toast', textContent: message });
    toast.style.background = type === 'success' ? '#0f766e' : '#dc2626';
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 2800);
}

function navigateTo(pageId, doctorId = null) {
    PAGES.forEach(id => { const page = $(id); if (page) page.style.display = id === pageId ? '' : 'none'; });
    if (pageId === 'page-view-doctor') initViewPage();
    if (pageId === 'page-view-all-doctor' && doctorId != null) initDetailPage(doctorId);
    if (pageId === 'page-add-doctor') initManagedForm('add');
    if (pageId === 'page-edit-doctor') initManagedForm('edit', doctorId);
    lucide.createIcons();
}

async function initViewPage() {
    await refreshDoctors();
    const search = $('view-search-input');
    renderDoctorRows(DoctorStore.search(search?.value || ''));
    if (!search || search.dataset.bound) return;
    search.dataset.bound = 'true';
    search.addEventListener('input', () => renderDoctorRows(DoctorStore.search(search.value)));
}

async function refreshDoctors() {
    try {
        await DoctorStore.load();
    } catch (error) {
        showToast(error.message || 'Unable to load doctors.', 'error');
    }
}

function renderDoctorRows(doctors) {
    const tbody = $('doctors-tbody');
    if (!tbody) return;
    tbody.innerHTML = doctors.length ? doctors.map(d => `
        <tr>
            <td class="doctor-name">${d.name}</td>
            <td>${d.department || '-'}</td>
            <td>${d.specialization || '-'}</td>
            <td>${d.phone || '-'}</td>
            <td><button class="view-link" data-view-id="${d.userId}">view all</button></td>
        </tr>
    `).join('') : '<tr><td colspan="5" style="text-align:center;color:#6b7280;padding:2rem;">No doctors found.</td></tr>';
}

function initDetailPage(id) {
    const doctor = DoctorStore.getById(id);
    if (!doctor) return;
    currentDoctorId = doctor.userId;
    $('detail-title').textContent = `All Details of ${DoctorStore.fullName(doctor)}`;
    Object.entries(DETAIL_FIELDS).forEach(([gridId, fields]) => {
        $(gridId).innerHTML = fields.map(([key, label]) => `
            <div class="info-field">
                <label>${label}</label>
                <input type="text" value="${doctor[key] || '-'}" readonly>
            </div>
        `).join('');
    });
}

function clearInvalid(form) {
    form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
}

function validateForm(form, start, end, type) {
    let valid = true;
    const checks = [
        ['firstName', value => /^[A-Za-z]+$/.test(value.trim())],
        ['lastName', value => /^[A-Za-z]+$/.test(value.trim())],
        ['specialization', value => /^[A-Za-z]+$/.test(value.trim())],
        ['qualification', value => value.trim() === '' || /^[A-Za-z]+$/.test(value.trim())],
        ['department', value => value.trim() === '' || /^[A-Za-z]+$/.test(value.trim())],
        ['email', value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())],
        ['gender', value => !!value],
        ['contact', value => value.trim() === '' || /^\d{10}$/.test(value.trim())],
        ['experience', value => value !== '' && Number(value) >= 0],
        ['slotDuration', value => value !== '' && Number(value) >= 5],
    ];
    if (type === 'add') checks.push(['password', value => value.length > 0]);
    checks.forEach(([name, rule]) => {
        const input = form.querySelector(`[name="${name}"]`);
        const ok = !!input && rule(input.value);
        setInvalid(input, !ok);
        if (!ok) valid = false;
    });
    const slotOk = start.value && end.value && start.value < end.value;
    setInvalid(start, !slotOk);
    setInvalid(end, !slotOk);
    return valid && slotOk;
}

function buildSlots(start, end, durationMinutes) {
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);
    const slots = [];
    let cursor = startHour * 60 + startMinute;
    const last = endHour * 60 + endMinute;
    while (cursor < last) {
        const hour = Math.floor(cursor / 60);
        const minute = cursor % 60;
        slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
        cursor += durationMinutes;
    }
    return slots;
}

function buildPayload(form, start, end) {
    const data = Object.fromEntries(new FormData(form).entries());
    const name = `Dr. ${data.firstName.trim()} ${data.lastName.trim()}`.trim();
    const payload = {
        name,
        email: data.email.trim().toLowerCase(),
        specialization: data.specialization.trim(),
        department: data.department.trim() || data.specialization.trim(),
        qualification: data.qualification.trim(),
        experience: Number(data.experience) || 0,
        gender: data.gender,
        phone: data.contact.trim(),
        slots: buildSlots(start.value, end.value, Number(data.slotDuration)),
    };
    if (data.password) payload.password = data.password;
    return payload;
}

function bindWordField(field) {
    field?.addEventListener('input', () => { field.value = field.value.replace(/\s/g, ''); });
    field?.addEventListener('keydown', event => { if (event.key === ' ') event.preventDefault(); });
}

function populateForm(form, doctor, start, end, hidden) {
    form.querySelector('[name="firstName"]').value = doctor.firstName || '';
    form.querySelector('[name="lastName"]').value = doctor.lastName || '';
    form.querySelector('[name="email"]').value = doctor.email || '';
    form.querySelector('[name="gender"]').value = doctor.gender || '';
    form.querySelector('[name="contact"]').value = doctor.phone || '';
    form.querySelector('[name="specialization"]').value = doctor.specialization || '';
    form.querySelector('[name="qualification"]').value = doctor.qualification || '';
    form.querySelector('[name="department"]').value = doctor.department || '';
    form.querySelector('[name="experience"]').value = doctor.experience || 0;
    const slots = doctor.slots || [];
    start.value = slots[0] || '';
    end.value = slots.length > 1 ? addMinutes(slots[slots.length - 1], timeDiffMinutes(slots[0], slots[1])) : '';
    form.querySelector('[name="slotDuration"]').value = slots.length > 1 ? timeDiffMinutes(slots[0], slots[1]) : 30;
    hidden.value = start.value && end.value ? `${formatTime(start.value)} to ${formatTime(end.value)}` : '';
    editDoctorId = doctor.userId;
}

function timeDiffMinutes(start, end) {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
}

function addMinutes(time, minutesToAdd) {
    const [hour, minute] = time.split(':').map(Number);
    const total = hour * 60 + minute + minutesToAdd;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function renderEditDropdown(doctors, searchBox, onPick) {
    removeEditDropdown();
    if (!doctors.length) return;
    const dropdown = Object.assign(document.createElement('ul'), { id: 'mb-search-dropdown' });
    doctors.forEach(doctor => {
        const item = Object.assign(document.createElement('li'), { textContent: DoctorStore.fullName(doctor) });
        item.addEventListener('mousedown', event => {
            event.preventDefault();
            onPick(doctor);
            removeEditDropdown();
        });
        dropdown.appendChild(item);
    });
    searchBox.appendChild(dropdown);
}

function wireForm(type) {
    if (formState[type]) return;
    formState[type] = true;
    const form = $(`${type}DoctorForm`);
    const start = $(`${type}-timeSlotStart`);
    const end = $(`${type}-timeSlotEnd`);
    const hidden = $(`${type}-timeSlots`);
    const search = $(`${type}-search-input`);
    const searchBox = search?.closest('.search-box');
    const syncTime = () => { hidden.value = start.value && end.value ? `${formatTime(start.value)} to ${formatTime(end.value)}` : ''; };

    FORM_FIELDS.forEach(name => bindWordField(form.querySelector(`[name="${name}"]`)));
    form.querySelector('[name="contact"]')?.addEventListener('input', event => {
        event.target.value = event.target.value.replace(/\D/g, '').slice(0, 10);
    });
    [start, end].forEach(input => input?.addEventListener('change', syncTime));

    if (type === 'edit' && search && searchBox) {
        search.addEventListener('input', () => {
            renderEditDropdown(DoctorStore.search(search.value), searchBox, doctor => {
                populateForm(form, doctor, start, end, hidden);
                search.value = DoctorStore.fullName(doctor);
                showToast(`Loaded profile of ${DoctorStore.fullName(doctor)}`);
            });
        });
        search.addEventListener('blur', () => setTimeout(removeEditDropdown, 150));
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();
        clearInvalid(form);
        if (type === 'edit' && !editDoctorId) {
            showToast('Please search and select a doctor first.', 'error');
            search?.focus();
            return;
        }
        syncTime();
        if (!validateForm(form, start, end, type)) return showToast('Please fix the highlighted fields.', 'error');
        const payload = buildPayload(form, start, end);
        try {
            if (type === 'add') {
                await DoctorStore.add(payload);
                form.reset();
                hidden.value = '';
                showToast('Doctor profile added successfully!');
            } else {
                await DoctorStore.update(editDoctorId, payload);
                showToast('Doctor profile updated successfully!');
            }
            setTimeout(() => navigateTo('page-view-doctor'), 1000);
        } catch (error) {
            showToast(error.message || 'Save failed.', 'error');
        }
    });

    $(`${type}-cancel-btn`)?.addEventListener('click', () => {
        if (confirm('Discard changes and go back?')) navigateTo('page-view-doctor');
    });
}

async function initManagedForm(type, preloadId) {
    await refreshDoctors();
    wireForm(type);
    const form = $(`${type}DoctorForm`);
    const start = $(`${type}-timeSlotStart`);
    const end = $(`${type}-timeSlotEnd`);
    const hidden = $(`${type}-timeSlots`);
    const dob = $(`${type}-dob`);
    form.reset();
    hidden.value = '';
    if (dob) dob.max = new Date().toISOString().split('T')[0];
    if (type === 'edit') {
        editDoctorId = null;
        removeEditDropdown();
        const search = $('edit-search-input');
        if (search) search.value = '';
        const doctor = preloadId != null ? DoctorStore.getById(preloadId) : null;
        if (doctor) {
            populateForm(form, doctor, start, end, hidden);
            if (search) search.value = DoctorStore.fullName(doctor);
        }
    }
}

document.addEventListener('click', event => {
    const button = event.target.closest('[data-action], [data-view-id], #back-to-list-btn');
    if (!button) return;
    if (button.id === 'back-to-list-btn') return navigateTo('page-view-doctor');
    if (button.dataset.viewId) return navigateTo('page-view-all-doctor', currentDoctorId = button.dataset.viewId);
    const page = { 'view-doctor': 'page-view-doctor', 'add-doctor': 'page-add-doctor', 'edit-doctor': 'page-edit-doctor' }[button.dataset.action];
    if (page) navigateTo(page, currentDoctorId);
});

document.addEventListener('DOMContentLoaded', () => navigateTo('page-view-doctor'));
