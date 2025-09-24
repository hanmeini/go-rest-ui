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

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderMovies();
    setupEventListeners();
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

// Fetch and render movies
async function fetchAndRenderMovies() {
    try {
        showLoading();
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const payload = await response.json();
        const movies = Array.isArray(payload)
            ? payload
            : (payload && Array.isArray(payload.data) ? payload.data : []);
        
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
        // Most likely CORS/network error
        showError('Gagal memuat daftar film. Pastikan server berjalan dan CORS diaktifkan.');
    }
}

// Create movie card element
// script.js

function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.dataset.movieId = movie.id; // 'id' sudah cocok

    // SOLUSI ADA DI SINI:
    // Pastikan kita menggunakan 'movie.pemeran', bukan 'movie.cast'
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
        
        const response = await fetch(`${apiUrl}/${movieId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const movie = await response.json();
        
        // Fill form with movie data
        fillForm(movie);
        
        // Show modal
        showModal();
        
    } catch (error) {
        console.error('Error fetching movie:', error);
        showError('Gagal memuat data film. Silakan coba lagi.');
    }
}

// Handle delete movie
async function handleDeleteMovie(movieId) {
    const confirmed = confirm('Apakah Anda yakin ingin menghapus film ini?');
    
    if (!confirmed) return;
    
    try {
        const response = await fetch(`${apiUrl}/${movieId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Refresh movie list
        await fetchAndRenderMovies();
        
        showSuccess('Film berhasil dihapus!');
        
    } catch (error) {
        console.error('Error deleting movie:', error);
        showError('Gagal menghapus film. Silakan coba lagi.');
    }
}

// Handle form submit
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(movieForm);
    const movieData = {
        judul: formData.get('title'),
        genre: formData.get('genre'),
        tahun_rilis: parseInt(formData.get('year')),
        sutradara: formData.get('director'),
        pemeran: formData.get('cast').split(',').map(s => s.trim())
    };
    
    const movieId = movieIdInput.value;
    const isEdit = movieId !== '';
    
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
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Clear form and hide modal
        clearForm();
        hideModal();
        
        // Refresh movie list
        await fetchAndRenderMovies();
        
        showSuccess(isEdit ? 'Film berhasil diperbarui!' : 'Film berhasil ditambahkan!');
        
    } catch (error) {
        console.error('Error saving movie:', error);
        showError('Gagal menyimpan film. Silakan coba lagi.');
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
function fillForm(movie) {
    document.getElementById('movie-id').value = movie.id;
    document.getElementById('title').value = movie.judul;
    document.getElementById('genre').value = movie.genre;
    document.getElementById('year').value = movie.tahun;
    document.getElementById('director').value = movie.sutradara;
    document.getElementById('cast').value = movie.pemeran;
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
