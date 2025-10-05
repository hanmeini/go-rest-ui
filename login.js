document.addEventListener('DOMContentLoaded', () => {
    console.log('Login page initialized');
    console.log('Current token:', localStorage.getItem('token'));
    console.log('Current username:', localStorage.getItem('username'));
    
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');

        const username = usernameInput ? usernameInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';

        console.log('Form submitted with username:', username);

        if (!username || !password) {
            console.log('Validation failed: missing username or password');
            alert('Mohon isi username dan password.');
            return;
        }

        console.log('Validation passed, proceeding with login request');

        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            console.log('Submit button disabled');
        }

        try {
            console.log('Sending login request to:', 'http://localhost:8080/api/login');
            console.log('Login data:', { username, password: '***' });
            
            const response = await fetch('http://localhost:8080/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            console.log('Login response status:', response.status);

            if (!response.ok) {
                // Try to extract error message from JSON or text
                let errorMessage = 'Login gagal. Periksa kredensial Anda.';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorData.error || errorMessage;
                    console.log('Login error data:', errorData);
                } catch (_) {
                    const text = await response.text();
                    if (text) errorMessage = text;
                    console.log('Login error text:', text);
                }
                throw new Error(errorMessage);
            }

            // Parse success response and extract token
            let data = {};
            try {
                data = await response.json();
                console.log('Login success data:', data);
            } catch (_) {
                // no-op: fall back to empty object
            }

            const token = data.token || data.access_token || data.jwt || (data.data && (data.data.token || data.data.access_token));
            if (!token) {
                console.log('No token found in response:', data);
                throw new Error('Token tidak ditemukan pada respons server.');
            }

            console.log('Token received, storing in localStorage');
            localStorage.setItem('token', token);
            localStorage.setItem('username', username);
            console.log('Redirecting to index.html');
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Login error:', error);
            const message = (error && error.message) ? error.message : 'Terjadi kesalahan saat memproses login.';
            console.log('Showing error message:', message);
            alert(message);
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                console.log('Submit button enabled');
            }
        }
    });
});


