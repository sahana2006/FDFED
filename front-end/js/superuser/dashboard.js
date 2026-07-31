fetch('./sidebar.html')
    .then(response => response.text())
    .then(html => {
        document.getElementById('sidebar-container').innerHTML = html;

        const activeLink = document.querySelector('[data-nav="frontdesk"]');
        if (activeLink) activeLink.classList.add('active');

        lucide.createIcons();
    });