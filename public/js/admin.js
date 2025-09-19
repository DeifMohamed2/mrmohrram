/**
 * Admin Dashboard JavaScript - Interactive Features
 */

// Global variables
let sidebarCollapsed = false;
let currentTheme = 'light';

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeAdminDashboard();
    loadDashboardData();
    setupEventListeners();
});

// Initialize dashboard
function initializeAdminDashboard() {
    // Load saved preferences
    loadUserPreferences();
    
    // Initialize tooltips
    initializeTooltips();
    
    // Setup real-time updates
    setupRealTimeUpdates();
    
    // Initialize search functionality
    initializeSearch();
}

// Load user preferences from localStorage
function loadUserPreferences() {
        const savedTheme = localStorage.getItem('admin-theme') || 'dark';
    const savedSidebarState = localStorage.getItem('admin-sidebar-collapsed') === 'true';
    
    setTheme(savedTheme);
    if (savedSidebarState) {
        toggleSidebar();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search input
    const searchInput = document.querySelector('.admin-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    // Modal close on overlay click
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('admin-modal-overlay')) {
            closeAllModals();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Form submissions
    setupFormHandlers();
}

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const mainContent = document.querySelector('.admin-main-content');
    
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
        sidebarCollapsed = !sidebarCollapsed;
        
        // Save state
        localStorage.setItem('admin-sidebar-collapsed', sidebarCollapsed);
        
        // Trigger resize event for responsive adjustments
        window.dispatchEvent(new Event('resize'));
    }
}

// Toggle theme
function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

// Set theme
function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('admin-theme', theme);
    updateThemeIcon(theme);
}

// Update theme icon
function updateThemeIcon(theme) {
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

// Handle search
function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    const searchResults = performSearch(query);
    displaySearchResults(searchResults);
}

// Perform search
function performSearch(query) {
    if (!query) return [];
    
    // This would typically make an API call
    // For now, we'll simulate search results
    const mockResults = [
        { type: 'student', name: 'Ahmed Mohammed', id: '1' },
        { type: 'week', name: 'Week 5 - Algebra', id: '2' },
        { type: 'homework', name: 'Mathematics Assignment', id: '3' }
    ];
    
    return mockResults.filter(item => 
        item.name.toLowerCase().includes(query)
    );
}

// Display search results
function displaySearchResults(results) {
    // Implementation for search results dropdown
    console.log('Search results:', results);
}

// Show notifications
function showNotifications() {
    // Implementation for notifications dropdown
    console.log('Showing notifications');
}

// Toggle user menu
function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Close user menu when clicking outside
document.addEventListener('click', function(e) {
    const userMenu = document.querySelector('.admin-user-menu');
    const dropdown = document.getElementById('userDropdown');
    
    if (userMenu && dropdown && !userMenu.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = '/auth/logout';
    }
}

// View profile function
function viewProfile() {
    // Close dropdown
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
    }
    // Navigate to profile or show profile modal
    console.log('Viewing profile');
    // You can implement profile viewing here
}

// Open settings function
function openSettings() {
    // Close dropdown
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
    }
    // Navigate to settings
    window.location.href = '/admin/settings';
}

// Modal functions
function openCreateUserModal() {
    const modal = document.getElementById('createUserModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeCreateUserModal() {
    const modal = document.getElementById('createUserModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        document.getElementById('createUserForm').reset();
    }
}

function openCreateWeekModal() {
    const modal = document.getElementById('createWeekModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeCreateWeekModal() {
    const modal = document.getElementById('createWeekModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        document.getElementById('createWeekForm').reset();
    }
}

function closeAllModals() {
    closeCreateUserModal();
    closeCreateWeekModal();
}

// Form handlers
function setupFormHandlers() {
    // Create user form
    const createUserForm = document.getElementById('createUserForm');
    if (createUserForm) {
        createUserForm.addEventListener('submit', function(e) {
            e.preventDefault();
            createUser();
        });
    }
    
    // Create week form
    const createWeekForm = document.getElementById('createWeekForm');
    if (createWeekForm) {
        createWeekForm.addEventListener('submit', function(e) {
            e.preventDefault();
            createWeek();
        });
    }
}

// Create user
async function createUser() {
    const form = document.getElementById('createUserForm');
    const formData = new FormData(form);
    const userData = Object.fromEntries(formData.entries());
    
    // Convert checkbox to boolean
    userData.isActive = formData.has('isActive');
    
    try {
        showLoading('Creating student...');
        
        const response = await fetch('/admin/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Student created successfully!');
            closeCreateUserModal();
            // Refresh the page or update the table
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showError(result.message || 'Failed to create student');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        showError('An error occurred while creating the student');
    } finally {
        hideLoading();
    }
}

// Create week
async function createWeek() {
    const form = document.getElementById('createWeekForm');
    const formData = new FormData(form);
    const weekData = Object.fromEntries(formData.entries());
    
    // Convert checkbox to boolean
    weekData.isActive = formData.has('isActive');
    
    try {
        showLoading('Creating week...');
        
        const response = await fetch('/admin/api/weeks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(weekData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Week created successfully!');
            closeCreateWeekModal();
            // Refresh the page or update the table
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showError(result.message || 'Failed to create week');
        }
    } catch (error) {
        console.error('Error creating week:', error);
        showError('An error occurred while creating the week');
    } finally {
        hideLoading();
    }
}

// Toggle student status
async function toggleStudentStatus(userId, action) {
    try {
        showLoading(`${action === 'activate' ? 'Activating' : 'Deactivating'} student...`);
        
        const response = await fetch(`/admin/api/users/${userId}/toggle-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess(`Student ${action}d successfully!`);
            // Refresh the page or update the table
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showError(result.message || `Failed to ${action} student`);
        }
    } catch (error) {
        console.error('Error toggling student status:', error);
        showError('An error occurred while updating student status');
    } finally {
        hideLoading();
    }
}

// View student details
function viewStudent(userId) {
    // Implementation for viewing student details
    console.log('Viewing student:', userId);
    // This could open a modal or navigate to a detailed view
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load real-time statistics
        await updateStatistics();
        
        // Load recent activity
        await updateRecentActivity();
        
        // Update badges
        await updateBadges();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Update statistics
async function updateStatistics() {
    try {
        const response = await fetch('/admin/api/statistics');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.success) {
            updateStatCards(data.stats);
        }
    } catch (error) {
        console.error('Error updating statistics:', error);
        // Don't show error to user, just log it
    }
}

// Update stat cards
function updateStatCards(stats) {
    const statCards = document.querySelectorAll('.admin-stat-value');
    if (statCards.length >= 4) {
        statCards[0].textContent = stats.totalStudents || 0;
        statCards[1].textContent = stats.totalWeeks || 0;
        statCards[2].textContent = stats.pendingHomework || 0;
        statCards[3].textContent = stats.completedHomework || 0;
    }
}

// Update recent activity
async function updateRecentActivity() {
    try {
        const response = await fetch('/admin/api/recent-activity');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.success) {
            updateActivityList(data.recentActivity);
        }
    } catch (error) {
        console.error('Error updating recent activity:', error);
        // Don't show error to user, just log it
    }
}

// Update activity list
function updateActivityList(activities) {
    // Implementation for updating activity list
    console.log('Updating activity list:', activities);
}

// Update badges
async function updateBadges() {
    try {
        const response = await fetch('/admin/api/badges');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.success) {
            updateBadgeCounts(data.badges);
        }
    } catch (error) {
        console.error('Error updating badges:', error);
        // Don't show error to user, just log it
    }
}

// Update badge counts
function updateBadgeCounts(badges) {
    const usersBadge = document.getElementById('usersBadge');
    const homeworkBadge = document.getElementById('homeworkBadge');
    const notificationBadge = document.getElementById('notificationBadge');
    
    if (usersBadge) usersBadge.textContent = badges.pendingUsers || 0;
    if (homeworkBadge) homeworkBadge.textContent = badges.pendingHomework || 0;
    if (notificationBadge) notificationBadge.textContent = (badges.pendingUsers + badges.pendingHomework) || 0;
}

// Setup real-time updates
function setupRealTimeUpdates() {
    // Update statistics every 30 seconds
    setInterval(updateStatistics, 30000);
    
    // Update activity every minute
    setInterval(updateRecentActivity, 60000);
    
    // Update badges every 2 minutes
    setInterval(updateBadges, 120000);
}

// Initialize search
function initializeSearch() {
    const searchInput = document.querySelector('.admin-search-input');
    if (searchInput) {
        // Add search suggestions
        searchInput.addEventListener('focus', showSearchSuggestions);
        searchInput.addEventListener('blur', hideSearchSuggestions);
    }
}

// Show search suggestions
function showSearchSuggestions() {
    // Implementation for search suggestions
    console.log('Showing search suggestions');
}

// Hide search suggestions
function hideSearchSuggestions() {
    // Implementation for hiding search suggestions
    console.log('Hiding search suggestions');
}

// Initialize tooltips
function initializeTooltips() {
    // Initialize Bootstrap tooltips if available
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.admin-search-input');
        if (searchInput) {
            searchInput.focus();
        }
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        closeAllModals();
    }
    
    // Ctrl/Cmd + B to toggle sidebar
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
    }
}

// Utility functions
function showLoading(message = 'Loading...') {
    // Implementation for loading indicator
    console.log('Loading:', message);
}

function hideLoading() {
    // Implementation for hiding loading indicator
    console.log('Hiding loading');
}

function showSuccess(message) {
    // Implementation for success notification
    console.log('Success:', message);
    // You could use a toast library or create custom notifications
}

function showError(message) {
    // Implementation for error notification
    console.log('Error:', message);
    // You could use a toast library or create custom notifications
}

// Export functions for global access
window.toggleSidebar = toggleSidebar;
window.toggleTheme = toggleTheme;
window.openCreateUserModal = openCreateUserModal;
window.closeCreateUserModal = closeCreateUserModal;
window.openCreateWeekModal = openCreateWeekModal;
window.closeCreateWeekModal = closeCreateWeekModal;
window.createUser = createUser;
window.createWeek = createWeek;
window.toggleStudentStatus = toggleStudentStatus;
window.viewStudent = viewStudent;
window.showNotifications = showNotifications;
window.toggleUserMenu = toggleUserMenu;
window.logout = logout;
window.viewProfile = viewProfile;
window.openSettings = openSettings;
