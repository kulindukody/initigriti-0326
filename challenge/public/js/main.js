// Main Application Logic - Intigriti Secure Search Portal

document.addEventListener('DOMContentLoaded', () => {

    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');

    const resultsContainer = document.getElementById('resultsContainer');

    if (q) {
        const cleanHTML = DOMPurify.sanitize(q, {
            FORBID_ATTR: ['id', 'class', 'style'],
            KEEP_CONTENT: true
        });

        resultsContainer.innerHTML = `<p>Results for: <span class="search-term-highlight">${cleanHTML}</span></p>
                                      <p style="margin-top: 10px; color: #64748b;">No matching records found in the current operational datastore.</p>`;
    } else {
        resultsContainer.innerHTML = `<p>Enter a query to search the secure enclave.</p>`;
    }

    if (window.ComponentManager) {
        window.ComponentManager.init();
    }

    const reportBtn = document.getElementById('reportBtn');
    const reportModal = document.getElementById('reportModal');
    const closeBtn = document.querySelector('.close-btn');
    const reportForm = document.getElementById('reportForm');
    const reportStatus = document.getElementById('reportStatus');

    reportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('reportUrl').value = window.location.href;
        reportModal.style.display = 'block';
    });

    closeBtn.addEventListener('click', () => {
        reportModal.style.display = 'none';
        reportStatus.textContent = '';
    });

    window.addEventListener('click', (e) => {
        if (e.target == reportModal) {
            reportModal.style.display = 'none';
            reportStatus.textContent = '';
        }
    });

    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const urlToReport = document.getElementById('reportUrl').value;
        reportStatus.textContent = "Sending to admin...";
        reportStatus.style.color = "var(--text-color)";

        try {
            const res = await fetch('/report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: urlToReport })
            });
            const text = await res.text();

            if (res.ok) {
                reportStatus.textContent = text;
                reportStatus.style.color = "var(--primary-color)";
            } else {
                reportStatus.textContent = "Error: " + text;
                reportStatus.style.color = "var(--error-color)";
            }
        } catch (err) {
            reportStatus.textContent = "Network error occurred.";
            reportStatus.style.color = "var(--error-color)";
        }
    });
});
