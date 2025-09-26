document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');

        const username = usernameInput ? usernameInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';

        if (!username || !password) {
            alert('Mohon isi username dan password.');
            return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;

        try {
            const response = await fetch('http://localhost:8080/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                // Try to extract error message from JSON or text
                let errorMessage = 'Login gagal. Periksa kredensial Anda.';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorData.error || errorMessage;
                } catch (_) {
                    const text = await response.text();
                    if (text) errorMessage = text;
                }
                throw new Error(errorMessage);
            }

            // Parse success response and extract token
            let data = {};
            try {
                data = await response.json();
            } catch (_) {
                // no-op: fall back to empty object
            }

            const token = data.token || data.access_token || data.jwt || (data.data && (data.data.token || data.data.access_token));
            if (!token) {
                throw new Error('Token tidak ditemukan pada respons server.');
            }

            localStorage.setItem('token', token);
            localStorage.setItem('username', username);
            window.location.href = 'index.html';
        } catch (error) {
            const message = (error && error.message) ? error.message : 'Terjadi kesalahan saat memproses login.';
            alert(message);
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
});


