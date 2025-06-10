// Global variables
let traders = [];
let currentTrader = null;
let sessions = [];
let currentSession = null;

// API Base URL - adjust if needed
const API_BASE = '/api';

// DOM Elements
const navButtons = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.section');
const loadingOverlay = document.getElementById('loading-overlay');
const notification = document.getElementById('notification');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadTraders();
    setTodayDate();
});

// Event listeners
function initializeEventListeners() {
    // Navigation
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => switchSection(btn.dataset.section));
    });

    // Trader modal
    document.getElementById('add-trader-btn').addEventListener('click', openTraderModal);
    document.getElementById('close-trader-modal').addEventListener('click', closeTraderModal);
    document.getElementById('cancel-trader-modal').addEventListener('click', closeTraderModal);
    document.getElementById('trader-form').addEventListener('submit', handleTraderSubmit);

    // Session modal
    document.getElementById('close-session-modal').addEventListener('click', closeSessionModal);

    // Trading form
    document.getElementById('trading-form').addEventListener('submit', handleTradingFormSubmit);
    document.getElementById('add-investor-btn').addEventListener('click', addInvestorRow);
    document.getElementById('reset-form-btn').addEventListener('click', resetTradingForm);

    // Filters
    document.getElementById('trader-filter').addEventListener('change', handleTraderFilterChange);
    document.getElementById('stats-trader-select').addEventListener('change', handleStatsTraderChange);

    // Notification close
    document.querySelector('.notification-close').addEventListener('click', hideNotification);

    // Modal backdrop clicks
    document.getElementById('trader-modal').addEventListener('click', (e) => {
        if (e.target.id === 'trader-modal') closeTraderModal();
    });
    document.getElementById('session-modal').addEventListener('click', (e) => {
        if (e.target.id === 'session-modal') closeSessionModal();
    });
}

// Navigation
function switchSection(sectionName) {
    // Update navigation
    navButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

    // Update sections
    sections.forEach(section => section.classList.remove('active'));
    document.getElementById(`${sectionName}-section`).classList.add('active');

    // Load data for specific sections
    if (sectionName === 'sessions') {
        loadTraderFilter();
    } else if (sectionName === 'calculator') {
        loadTraderSelects();
    } else if (sectionName === 'statistics') {
        loadStatsTraderSelect();
    }
}

// API Functions
async function apiCall(endpoint, options = {}) {
    showLoading();
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'API request failed');
        }

        return await response.json();
    } catch (error) {
        showNotification(error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

// Traders Management
async function loadTraders() {
    try {
        traders = await apiCall('/traders');
        renderTraders();
    } catch (error) {
        console.error('Error loading traders:', error);
    }
}

function renderTraders() {
    const container = document.getElementById('traders-list');
    
    if (traders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No traders found</h3>
                <p>Add your first trader to get started</p>
            </div>
        `;
        return;
    }

    container.innerHTML = traders.map(trader => `
        <div class="trader-card">
            <h3>${trader.name}</h3>
            <p><strong>Email:</strong> ${trader.email}</p>
            <p><strong>Joined:</strong> ${formatDate(trader.created_at)}</p>
            <div class="card-actions">
                <button class="btn btn-primary btn-small" onclick="viewTraderSessions(${trader.id})">
                    View Sessions
                </button>
                <button class="btn btn-secondary btn-small" onclick="viewTraderStats(${trader.id})">
                    Statistics
                </button>
            </div>
        </div>
    `).join('');
}

async function handleTraderSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const traderData = {
        name: formData.get('name') || document.getElementById('trader-name').value,
        email: formData.get('email') || document.getElementById('trader-email').value
    };

    try {
        await apiCall('/traders', {
            method: 'POST',
            body: JSON.stringify(traderData)
        });
        
        closeTraderModal();
        loadTraders();
        showNotification('Trader added successfully!', 'success');
        e.target.reset();
    } catch (error) {
        console.error('Error adding trader:', error);
    }
}