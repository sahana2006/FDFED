(function () {
    const API_BASE_URL = 'http://localhost:3000';
    const formState = { add: false, edit: false };
    let currentViewAllId = null;
    let editCurrentStaffId = null;

    const $ = id => document.getElementById(id);
    const setInvalid = (el, invalid) => el && el.classList.toggle('invalid', invalid);
    const clearInvalid = form => form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
    const bindSingleWord = el => {
        el?.addEventListener('input', () => { el.value = el.value.replace(/\s/g, ''); });
        el?.addEventListener('keydown', e => { if (e.key === ' ') e.preventDefault(); });
    };
    const bindDigits = (el, max) => el?.addEventListener('input', () => { el.value = el.value.replace(/\D/g, '').slice(0, max); });
    const today = () => new Date().toISOString().split('T')[0];
    const fullName = member => member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim();

    const formatTime12 = value => {
        if (!value) return '';
        const [h, m] = value.split(':').map(Number);
        return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
    };

    const formatDate = value => {
        if (!value) return '-';
        const [y, m, d] = value.split('-');
        return y && m && d ? `${d}/${m}/${y}` : value;
    };

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

    function normalizeMember(member) {
        const [firstName = '', ...rest] = (member.name || '').split(' ');
        return {
            ...member,
            id: member.userId,
            firstName,
            lastName: rest.join(' '),
            contact: member.phone || '',
            languages: Array.isArray(member.languages) ? member.languages : [],
            languageCount: Array.isArray(member.languages) ? member.languages.length : 0,
            counter: member.counter || '',
            shiftStart: member.shiftStart || '',
            shiftEnd: member.shiftEnd || '',
        };
    }

    window.StaffStore = {
        staff: [],
        async load() {
            const response = await fetch(`${API_BASE_URL}/frontdesk`, {
                headers: { role: getCurrentRole() },
            });
            if (!response.ok) throw new Error(await getErrorMessage(response));
            this.staff = (await response.json()).map(normalizeMember);
            return this.staff;
        },
        getAll() { return this.staff; },
        getById(id) { return this.staff.find(s => s.userId === id || s.id === id) || null; },
        async add(member) {
            const response = await fetch(`${API_BASE_URL}/frontdesk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', role: getCurrentRole() },
                body: JSON.stringify(member),
            });
            if (!response.ok) throw new Error(await getErrorMessage(response));
            const created = normalizeMember(await response.json());
            this.staff.push(created);
            return created;
        },
        async update(userId, updates) {
            const response = await fetch(`${API_BASE_URL}/frontdesk/${encodeURIComponent(userId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', role: getCurrentRole() },
                body: JSON.stringify(updates),
            });
            if (!response.ok) throw new Error(await getErrorMessage(response));
            const updated = normalizeMember(await response.json());
            const index = this.staff.findIndex(s => s.userId === updated.userId);
            if (index >= 0) this.staff[index] = updated;
            return updated;
        },
        search(query) {
            const q = query.trim().toLowerCase();
            return !q ? this.getAll() : this.getAll().filter(s =>
                fullName(s).toLowerCase().includes(q) ||
                (s.contact || '').includes(q) ||
                (s.languages || []).some(l => l.toLowerCase().includes(q))
            );
        },
        fullName,
        formatShift: member => member.shiftStart && member.shiftEnd ? `${formatTime12(member.shiftStart)} - ${formatTime12(member.shiftEnd)}` : '-',
    };

    function showToast(message, type = 'success') {
        const existing = $('mb-toast');
        if (existing) existing.remove();
        const toast = Object.assign(document.createElement('div'), { id: 'mb-toast', textContent: message });
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            background: type === 'success' ? '#0f766e' : '#dc2626',
            color: 'white',
            padding: '1rem 2rem',
            borderRadius: '0.75rem',
            fontSize: '1rem',
            fontWeight: '600',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            zIndex: '9999',
            transition: 'opacity 0.4s',
        });
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 400); }, 2800);
    }

    async function refreshStaff() {
        try {
            await StaffStore.load();
        } catch (error) {
            showToast(error.message || 'Unable to load frontdesk staff.', 'error');
        }
    }

    async function showPage(name) {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        $(`page-${name}`)?.classList.add('active');
        if (name === 'view') {
            await refreshStaff();
            renderStaffTable(StaffStore.search($('viewSearchInput')?.value || ''));
        }
        if (name === 'edit') {
            await refreshStaff();
            initForm('edit');
        }
        document.querySelector('.content').scrollTop = 0;
        lucide.createIcons();
    }

    function field(label, value) {
        return `<div class="info-group"><label>${label}</label><div class="info-value">${value || '-'}</div></div>`;
    }

    function renderStaffTable(members) {
        const tbody = $('staffTableBody');
        if (!tbody) return;
        tbody.innerHTML = members.length ? members.map(m => `
            <tr>
                <td class="staff-name">${StaffStore.fullName(m)}</td>
                <td>${m.counter ? `Counter ${m.counter}` : '-'}</td>
                <td>${(m.languages || []).join(', ') || '-'}</td>
                <td>${m.contact || '-'}</td>
                <td class="view-all"><a href="javascript:void(0)" onclick="openViewAll('${m.userId}')">view all</a></td>
            </tr>
        `).join('') : '<tr><td colspan="5" style="text-align:center;color:#6b7280;padding:2rem;">No staff members found.</td></tr>';
    }

    function renderViewAll(id) {
        const member = StaffStore.getById(id);
        if (!member) {
            $('profileTitle').textContent = 'Staff member not found';
            ['personalGrid', 'professionalGrid', 'availabilityGrid'].forEach(gridId => $(gridId).innerHTML = '');
            return;
        }
        $('profileTitle').textContent = `All Details of ${StaffStore.fullName(member)}`;
        $('personalGrid').innerHTML = [
            field('User ID', member.userId),
            field('Name', StaffStore.fullName(member)),
            field('E-Mail Id', member.email),
            field('Gender', member.gender),
            field('Contact No', member.contact),
        ].join('');
        $('professionalGrid').innerHTML = [
            field('Reporting Manager ID', member.reportingManagerId),
            field('Language Proficiency', (member.languages || []).join(', ')),
        ].join('');
        $('availabilityGrid').innerHTML = [
            field('Counter Number', member.counter ? `Counter ${member.counter}` : '-'),
            field('Current Shift', StaffStore.formatShift(member)),
        ].join('');
    }

    function buildLangBoxes(prefix, count, existing = []) {
        const boxes = $(`${prefix}_languageBoxes`);
        const hidden = $(`${prefix}_languageCountHidden`);
        boxes.innerHTML = '';
        hidden.value = count;
        for (let i = 1; i <= count; i += 1) {
            const input = Object.assign(document.createElement('input'), {
                type: 'text',
                name: `${prefix}_language_${i}`,
                placeholder: `Language ${i}`,
                className: 'language-box',
                value: existing[i - 1] || '',
            });
            bindSingleWord(input);
            boxes.appendChild(input);
        }
    }

    function collectLanguages(prefix) {
        const count = parseInt($(`${prefix}_languageCountHidden`).value, 10) || 0;
        const values = [];
        for (let i = 1; i <= count; i += 1) {
            const box = document.querySelector(`[name="${prefix}_language_${i}"]`);
            if (box?.value.trim()) values.push(box.value.trim());
        }
        return values;
    }

    function validateForm(prefix, type) {
        let valid = true;
        ['firstName', 'lastName'].forEach(name => {
            const el = $(`${prefix}_${name}`);
            const ok = !!el?.value.trim() && /^[A-Za-z]+$/.test(el.value.trim());
            setInvalid(el, !ok);
            if (!ok) valid = false;
        });
        const email = $(`${prefix}_email`);
        const emailOk = !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
        setInvalid(email, !emailOk);
        if (!emailOk) valid = false;

        const password = $(`${prefix}_password`);
        if (type === 'add') {
            const passwordOk = !!password?.value;
            setInvalid(password, !passwordOk);
            if (!passwordOk) valid = false;
        }

        const contact = $(`${prefix}_contact`);
        const contactOk = !contact?.value.trim() || /^\d{10}$/.test(contact.value.trim());
        setInvalid(contact, !contactOk);
        if (!contactOk) valid = false;

        const start = $(`${prefix}_shiftStart`);
        const end = $(`${prefix}_shiftEnd`);
        const shiftOk = (!start?.value && !end?.value) || (start.value && end.value && start.value < end.value);
        setInvalid(start, !shiftOk);
        setInvalid(end, !shiftOk);
        return valid && shiftOk;
    }

    function buildMember(prefix) {
        return {
            name: `${$(`${prefix}_firstName`).value.trim()} ${$(`${prefix}_lastName`).value.trim()}`.trim(),
            email: $(`${prefix}_email`).value.trim().toLowerCase(),
            password: $(`${prefix}_password`)?.value || undefined,
            phone: $(`${prefix}_contact`).value.trim(),
            gender: $(`${prefix}_gender`).value,
            reportingManagerId: $(`${prefix}_reportingManagerId`).value.trim(),
            languages: collectLanguages(prefix),
            counter: $(`${prefix}_counter`).value.trim(),
            shiftStart: $(`${prefix}_shiftStart`).value,
            shiftEnd: $(`${prefix}_shiftEnd`).value,
        };
    }

    function populateEditForm(member) {
        $('edit_firstName').value = member.firstName || '';
        $('edit_lastName').value = member.lastName || '';
        $('edit_email').value = member.email || '';
        $('edit_gender').value = member.gender || '';
        $('edit_contact').value = member.contact || '';
        $('edit_reportingManagerId').value = member.reportingManagerId || '';
        $('edit_counter').value = member.counter || '';
        $('edit_shiftStart').value = member.shiftStart || '';
        $('edit_shiftEnd').value = member.shiftEnd || '';
        const count = member.languageCount || (member.languages || []).length || 1;
        $('edit_languageCount').value = count;
        buildLangBoxes('edit', count, member.languages || []);
        editCurrentStaffId = member.userId;
    }

    function removeDropdown() {
        $('mb-dropdown')?.remove();
    }

    function buildDropdown(members) {
        removeDropdown();
        if (!members.length) return;
        const searchBox = $('editSearchInput').closest('.search-box');
        searchBox.style.position = 'relative';
        const dropdown = Object.assign(document.createElement('ul'), { id: 'mb-dropdown' });
        Object.assign(dropdown.style, {
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: '0',
            right: '0',
            background: 'white',
            border: '2px solid #000',
            borderRadius: '0.5rem',
            listStyle: 'none',
            margin: '0',
            padding: '0.25rem 0',
            zIndex: '100',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            maxHeight: '200px',
            overflowY: 'auto',
        });
        members.forEach(member => {
            const li = Object.assign(document.createElement('li'), { textContent: StaffStore.fullName(member) });
            Object.assign(li.style, {
                padding: '0.65rem 1rem',
                cursor: 'pointer',
                fontSize: '0.95rem',
                color: '#000',
                borderBottom: '1px solid #f3f4f6',
            });
            li.addEventListener('mouseenter', () => { li.style.background = '#f0fdfb'; });
            li.addEventListener('mouseleave', () => { li.style.background = 'white'; });
            li.addEventListener('mousedown', event => {
                event.preventDefault();
                populateEditForm(member);
                $('editSearchInput').value = StaffStore.fullName(member);
                removeDropdown();
                showToast(`Loaded profile of ${StaffStore.fullName(member)}`);
            });
            dropdown.appendChild(li);
        });
        searchBox.appendChild(dropdown);
    }

    function initForm(type) {
        if (formState[type]) return;
        formState[type] = true;
        const prefix = type === 'add' ? 'add' : 'edit';
        const form = $(`${type === 'add' ? 'addStaffForm' : 'editStaffForm'}`);
        if ($(`${prefix}_dob`)) $(`${prefix}_dob`).max = today();
        if ($(`${prefix}_dateJoining`)) $(`${prefix}_dateJoining`).max = today();
        [`${prefix}_firstName`, `${prefix}_lastName`, `${prefix}_reportingManagerId`].forEach(id => bindSingleWord($(id)));
        bindDigits($(`${prefix}_contact`), 10);

        $(`${prefix}_generateLangBtn`).addEventListener('click', () => {
            const count = parseInt($(`${prefix}_languageCount`).value, 10);
            if (!count || count < 1 || count > 3) {
                $(`${prefix}_languageCount`).classList.add('invalid');
                return showToast('Enter a number between 1 and 3.', 'error');
            }
            $(`${prefix}_languageCount`).classList.remove('invalid');
            buildLangBoxes(prefix, count);
        });

        if (type === 'edit') {
            const search = $('editSearchInput');
            search.addEventListener('input', () => {
                const q = search.value.trim();
                if (!q) return removeDropdown();
                buildDropdown(StaffStore.search(q));
            });
            search.addEventListener('blur', () => setTimeout(removeDropdown, 150));
        }

        form.addEventListener('submit', async event => {
            event.preventDefault();
            clearInvalid(form);
            if (type === 'edit' && !editCurrentStaffId) {
                showToast('Please search and select a staff member first.', 'error');
                return $('editSearchInput').focus();
            }
            if (!validateForm(prefix, type)) return showToast('Please fix the highlighted fields.', 'error');
            const payload = buildMember(prefix);
            try {
                if (type === 'add') {
                    await StaffStore.add(payload);
                    form.reset();
                    $(`${prefix}_languageBoxes`).innerHTML = '';
                    $(`${prefix}_languageCountHidden`).value = '';
                    showToast('Staff profile added successfully!');
                } else {
                    await StaffStore.update(editCurrentStaffId, payload);
                    showToast('Staff profile updated successfully!');
                }
                setTimeout(() => showPage('view'), 1000);
            } catch (error) {
                showToast(error.message || 'Save failed.', 'error');
            }
        });

        $(`${prefix === 'add' ? 'add' : 'edit'}_cancelBtn`)?.addEventListener('click', () => {
            if (confirm('Discard changes and go back?')) showPage('view');
        });
    }

    async function initViewPage() {
        await refreshStaff();
        renderStaffTable(StaffStore.getAll());
        const search = $('viewSearchInput');
        if (!search || search.dataset.bound) return;
        search.dataset.bound = 'true';
        search.addEventListener('input', () => renderStaffTable(StaffStore.search(search.value)));
    }

    window.showPage = showPage;
    window.goEditFromView = async function () {
        await showPage('edit');
        const member = currentViewAllId ? StaffStore.getById(currentViewAllId) : null;
        if (member) {
            populateEditForm(member);
            $('editSearchInput').value = StaffStore.fullName(member);
        }
    };
    window.openViewAll = function (id) {
        currentViewAllId = id;
        renderViewAll(id);
        showPage('viewall');
    };
    window.formatTime12 = formatTime12;

    document.addEventListener('DOMContentLoaded', () => {
        initViewPage();
        initForm('add');
        lucide.createIcons();
    });
})();
