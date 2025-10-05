// Auth guard: redirect to login if token missing
const getToken = () => localStorage.getItem('token');
const API_BASE = 'http://localhost:8080/api';

if (!getToken()) {
    window.location.href = 'login.html';
}

// Inject Authorization header into all API fetch calls and handle 401
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    const isApiRequest = typeof url === 'string' && url.startsWith(API_BASE);

    if (isApiRequest) {
        const token = getToken();
        console.log('API Request to:', url, 'Method:', init.method || 'GET');
        console.log('Token available:', !!token);
        
        if (!init.headers) init.headers = {};
        // Normalize Headers to plain object for easy merge
        if (init.headers instanceof Headers) {
            const headersObj = {};
            init.headers.forEach((v, k) => { headersObj[k] = v; });
            init.headers = headersObj;
        }
        if (token) {
            init.headers['Authorization'] = `Bearer ${token}`;
            console.log('Authorization header added');
        }
    }

    const response = await originalFetch(input, init);
    
    if (isApiRequest) {
        console.log('API Response:', url, 'Status:', response.status);
    }
    
    if (response.status === 401) {
        console.log('Unauthorized response, redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        try { await response.clone().text(); } catch (_) {}
        window.location.href = 'login.html';
        throw new Error('Unauthorized');
    }
    return response;
};

// Utility: safely extract error message without exhausting the original response body
async function extractErrorMessage(response) {
    const fallback = `HTTP error! status: ${response.status}`;
    try {
        const clone = response.clone();
        const text = await clone.text();
        if (!text) return fallback;
        try {
            const data = JSON.parse(text);
            return data.message || data.error || text;
        } catch (_) {
            return text;
        }
    } catch (_) {
        return fallback;
    }
}

// API Configuration
const apiUrl = 'http://localhost:8080/api/movies';

// DOM Elements
const movieList = document.getElementById('movie-list');
const modal = document.getElementById('modal');
const movieForm = document.getElementById('movie-form');
const fab = document.getElementById('fab');
const closeModal = document.getElementById('close-modal');
const cancelBtn = document.getElementById('cancel-btn');
const movieIdInput = document.getElementById('movie-id');
const welcome = document.getElementById('welcome');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('Go-Flix Movie Manager initialized');
    console.log('API URL:', apiUrl);
    console.log('Token exists:', !!getToken());
    console.log('Username:', localStorage.getItem('username'));
    
    fetchAndRenderMovies();
    setupEventListeners();
    setupLogoutButton();
    renderWelcome();
});

// Event Listeners Setup
function setupEventListeners() {
    // FAB click to show modal
    fab.addEventListener('click', showModal);
    
    // Close modal buttons
    closeModal.addEventListener('click', hideModal);
    cancelBtn.addEventListener('click', hideModal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideModal();
        }
    });
    
    // Form submit
    movieForm.addEventListener('submit', handleFormSubmit);
    
    // Event delegation for movie list actions
    movieList.addEventListener('click', handleMovieListClick);
}

function renderWelcome() {
    if (!welcome) return;
    const username = localStorage.getItem('username');
    if (!username) { welcome.innerHTML = ''; return; }
    welcome.innerHTML = `
        <div class="card" style="display:flex;align-items:center;gap:12px; padding: 1rem 1.25rem; border: 1px solid var(--border-color); border-radius: 12px; background: var(--card-bg);">
            <i class="fas fa-hand-peace" style="color: var(--highlight-2);"></i>
            <div>
                <div style="font-weight:700;">Selamat datang, ${escapeHtml(username)}!</div>
                <div style="color: var(--text-muted); font-size: 0.95rem;">Senang melihat Anda kembali. Jelajahi koleksi film Anda.</div>
            </div>
        </div>
    `;
}

// Setup Logout button in header
function setupLogoutButton() {
    const headerContainer = document.querySelector('.header .container');
    if (!headerContainer) return;

    // Avoid duplicate button if script runs twice
    if (document.getElementById('logout-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'logout-btn';
    btn.className = 'btn btn-secondary';
    btn.title = 'Logout';
    btn.style.marginLeft = 'auto';
    btn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';

    // Place button aligned to the right on the same row
    headerContainer.style.display = 'flex';
    headerContainer.style.alignItems = 'center';
    headerContainer.appendChild(btn);

    btn.addEventListener('click', handleLogout);
}

async function handleLogout() {
    try {
        console.log('Logging out...');
        await fetch(`${API_BASE}/logout`, { method: 'POST' });
        console.log('Logout request sent successfully');
    } catch (error) {
        console.log('Logout request failed:', error);
        // Ignore network errors and proceed to clear session
    } finally {
        console.log('Clearing local storage and redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        window.location.href = 'login.html';
    }
}

// Fetch and render movies
async function fetchAndRenderMovies() {
    try {
        showLoading();
        
        console.log('Fetching movies from:', apiUrl);
        const response = await fetch(apiUrl);
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorMessage = await extractErrorMessage(response);
            throw new Error(errorMessage);
        }
        
        const payload = await response.json();
        console.log('Received payload:', payload);
        
        const movies = Array.isArray(payload)
            ? payload
            : (payload && Array.isArray(payload.data) ? payload.data : []);
        
        console.log('Processed movies:', movies);
        
        // Clear the movie list
        movieList.innerHTML = '';
        
        if (!Array.isArray(movies) || movies.length === 0) {
            showEmptyState();
            return;
        }
        
        // Render each movie
        movies.forEach(movie => {
            const movieCard = createMovieCard(movie);
            movieList.appendChild(movieCard);
        });
        
    } catch (error) {
        console.error('Error fetching movies:', error);
        const message = error.message || 'Gagal memuat daftar film. Pastikan server berjalan dan CORS diaktifkan.';
        showError(message);
    }
}

// Create movie card element
// script.js

function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.dataset.movieId = movie.id; // 'id' sudah cocok

    // SOLUSI ADA DI SINI:
    const pemeranList = movie.pemeran ? movie.pemeran.join(', ') : 'Tidak ada informasi';
    
    card.innerHTML = `
        <h3 class="movie-title">${escapeHtml(movie.judul)}</h3>
        <div class="movie-info">
            <span><i class="fas fa-theater-masks"></i> ${escapeHtml(movie.genre)}</span>
            <span><i class="fas fa-calendar-alt"></i> ${movie.tahun_rilis}</span>
            <span><i class="fas fa-user-tie"></i> ${escapeHtml(movie.sutradara)}</span>
            <span><i class="fas fa-users"></i> ${escapeHtml(pemeranList)}</span>
        </div>
        <div class="movie-actions">
            <button class="btn btn-secondary edit-btn" data-movie-id="${movie.id}">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn btn-danger delete-btn" data-movie-id="${movie.id}">
                <i class="fas fa-trash"></i> Hapus
            </button>
        </div>
    `;
    
    return card;
}

// Handle movie list click events (event delegation)
function handleMovieListClick(e) {
    const target = e.target.closest('button');
    if (!target) return;
    
    const movieId = target.dataset.movieId;
    
    if (target.classList.contains('edit-btn')) {
        handleEditMovie(movieId);
    } else if (target.classList.contains('delete-btn')) {
        handleDeleteMovie(movieId);
    }
}

// Handle edit movie
async function handleEditMovie(movieId) {
    try {
        showLoading();
        
        console.log('Fetching movie for edit:', movieId);
        const response = await fetch(`${apiUrl}/${movieId}`);
        
        console.log('Edit response status:', response.status);
        
        if (!response.ok) {
            const errorMessage = await extractErrorMessage(response);
            throw new Error(errorMessage);
        }
        
        const movie = await response.json();
        console.log('Movie data for edit:', movie);
        
        // Fill form with movie data
        fillForm(movie);
        
        // Show modal
        showModal();
        
    } catch (error) {
        console.error('Error fetching movie:', error);
        const message = error.message || 'Gagal memuat data film. Silakan coba lagi.';
        showError(message);
    }
}

// Handle delete movie
async function handleDeleteMovie(movieId) {
    const confirmed = confirm('Apakah Anda yakin ingin menghapus film ini?');
    
    if (!confirmed) return;
    
    try {
        console.log('Deleting movie:', movieId);
        const response = await fetch(`${apiUrl}/${movieId}`, {
            method: 'DELETE'
        });
        
        console.log('Delete response status:', response.status);
        
        if (!response.ok) {
            const errorMessage = await extractErrorMessage(response);
            throw new Error(errorMessage);
        }
        
        // Refresh movie list
        await fetchAndRenderMovies();
        
        showSuccess('Film berhasil dihapus!');
        
    } catch (error) {
        console.error('Error deleting movie:', error);
        const message = error.message || 'Gagal menghapus film. Silakan coba lagi.';
        showError(message);
    }
}

// Handle form submit
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(movieForm);
    
    // Validasi input
    const title = formData.get('title')?.trim();
    const genre = formData.get('genre')?.trim();
    const year = formData.get('year');
    const director = formData.get('director')?.trim();
    const cast = formData.get('cast')?.trim();
    
    if (!title || !genre || !year || !director || !cast) {
        showError('Mohon lengkapi semua field yang wajib diisi.');
        return;
    }
    
    const movieData = {
        judul: title,
        genre: genre,
        tahun_rilis: parseInt(year),
        sutradara: director,
        pemeran: cast.split(',').map(s => s.trim()).filter(s => s.length > 0)
    };
    
    // Validasi tahun
    if (isNaN(movieData.tahun_rilis) || movieData.tahun_rilis < 1900 || movieData.tahun_rilis > 2030) {
        showError('Tahun rilis harus berupa angka antara 1900-2030.');
        return;
    }
    
    // Validasi pemeran
    if (movieData.pemeran.length === 0) {
        showError('Minimal satu pemeran harus diisi.');
        return;
    }
    
    const movieId = movieIdInput.value;
    const isEdit = movieId !== '';
    
    // Debug: log data yang akan dikirim
    console.log('Sending movie data:', movieData);
    
    try {
        let response;
        
        if (isEdit) {
            // Update existing movie
            response = await fetch(`${apiUrl}/${movieId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(movieData)
            });
        } else {
            // Create new movie
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(movieData)
            });
        }
        
        if (!response.ok) {
            // Coba ambil pesan error dari server
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (_) {
                try {
                    const text = await response.text();
                    if (text) errorMessage = text;
                } catch (__) {
                    // Response body sudah dibaca atau tidak bisa dibaca
                }
            }
            throw new Error(errorMessage);
        }
        
        // Clear form and hide modal
        clearForm();
        hideModal();
        
        // Refresh movie list
        await fetchAndRenderMovies();
        
        showSuccess(isEdit ? 'Film berhasil diperbarui!' : 'Film berhasil ditambahkan!');
        
    } catch (error) {
        console.error('Error saving movie:', error);
        const message = error.message || 'Gagal menyimpan film. Silakan coba lagi.';
        showError(message);
    }
}

// Show modal
function showModal() {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Hide modal
function hideModal() {
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
    clearForm();
}

// Fill form with movie data
// script.js

// Ganti fungsi ini dengan yang baru
function fillForm(movie) {
    document.getElementById('movie-id').value = movie.id;
    document.getElementById('title').value = movie.judul;
    document.getElementById('genre').value = movie.genre;
    
    // PERBAIKAN 1: Gunakan 'tahun_rilis'
    document.getElementById('year').value = movie.tahun_rilis; 
    
    document.getElementById('director').value = movie.sutradara;
    
    // PERBAIKAN 2: Gabungkan array 'pemeran' menjadi string dengan join()
    if (Array.isArray(movie.pemeran)) {
        document.getElementById('cast').value = movie.pemeran.join(', ');
    } else {
        document.getElementById('cast').value = movie.pemeran;
    }
}

// Clear form
function clearForm() {
    movieForm.reset();
    movieIdInput.value = '';
}

// Show loading state
function showLoading() {
    movieList.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-muted);">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
            <p>Memuat data film...</p>
        </div>
    `;
}

// Show empty state
function showEmptyState() {
    movieList.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
            <i class="fas fa-film" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
            <h3>Belum ada film</h3>
            <p>Klik tombol + di pojok kanan bawah untuk menambahkan film pertama Anda.</p>
        </div>
    `;
}

// Show error message
function showError(message) {
    console.error('Error:', message);
    showNotification(message, 'error');
}

// Show success message
function showSuccess(message) {
    showNotification(message, 'success');
}

// Show notification
function showNotification(message, type) {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 3000;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
        box-shadow: var(--shadow);
    `;
    
    if (type === 'error') {
        notification.style.background = '#dc3545';
    } else {
        notification.style.background = '#28a745';
    }
    
    notification.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }, 3000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
