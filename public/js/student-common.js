// Student Common JavaScript Functions

// Theme Management
class StudentThemeManager {
  constructor() {
    this.init();
  }

  init() {
    this.loadTheme();
    this.bindEvents();
  }

  loadTheme() {
    const savedTheme = localStorage.getItem('student-theme') || 'dark';
    this.setTheme(savedTheme);
  }

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('student-theme', theme);

    // Update theme toggle button
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.setAttribute('data-theme', theme);
    }
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);

    // Add transition effect
    document.body.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      document.body.style.transition = '';
    }, 300);
  }

  bindEvents() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }
  }
}

// Navigation Scroll Effect
class StudentNavigation {
  constructor() {
    this.init();
  }

  init() {
    this.bindScrollEffect();
    this.bindMobileToggle();
  }

  bindScrollEffect() {
    const navbar = document.getElementById('studentNavbar');
    let lastScrollTop = 0;

    window.addEventListener('scroll', () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;

      if (scrollTop > lastScrollTop && scrollTop > 100) {
        // Scrolling down
        navbar.style.transform = 'translateY(-100%)';
      } else {
        // Scrolling up
        navbar.style.transform = 'translateY(0)';
      }

      lastScrollTop = scrollTop;

      // Add background blur when scrolled
      if (scrollTop > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }

  bindMobileToggle() {
    // Auto-close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
      const navbarCollapse = document.querySelector('.navbar-collapse');
      const navbarToggler = document.querySelector('.navbar-toggler');

      if (navbarCollapse && navbarToggler) {
        if (
          !navbarCollapse.contains(e.target) &&
          !navbarToggler.contains(e.target)
        ) {
          const bsCollapse = new bootstrap.Collapse(navbarCollapse, {
            toggle: false,
          });
          bsCollapse.hide();
        }
      }
    });
  }
}

// Notification System
class StudentNotifications {
  constructor() {
    this.init();
  }

  init() {
    this.createContainer();
  }

  createContainer() {
    if (!document.getElementById('notificationContainer')) {
      const container = document.createElement('div');
      container.id = 'notificationContainer';
      container.className = 'notification-container';
      container.style.cssText = `
                position: fixed;
                top: 100px;
                right: 20px;
                z-index: 1060;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            `;
      document.body.appendChild(container);
    }
  }

  show(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `student-notification notification-${type}`;
    notification.style.cssText = `
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 12px;
            padding: 16px 20px;
            min-width: 300px;
            max-width: 400px;
            color: var(--bs-body-color);
            box-shadow: var(--glass-shadow);
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s ease;
            pointer-events: auto;
            cursor: pointer;
            position: relative;
            overflow: hidden;
        `;

    // Add icon based on type
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle',
    };

    notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="${icons[type]}" style="color: var(--student-${
      type === 'error' ? 'danger' : type
    });"></i>
                <span>${message}</span>
                <i class="fas fa-times" style="margin-left: auto; opacity: 0.7; cursor: pointer;"></i>
            </div>
        `;

    // Add click to close
    notification.addEventListener('click', () => this.hide(notification));

    // Add to container
    const container = document.getElementById('notificationContainer');
    container.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    }, 10);

    // Auto hide
    if (duration > 0) {
      setTimeout(() => this.hide(notification), duration);
    }

    return notification;
  }

  hide(notification) {
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }
}

// Loading Manager
class StudentLoadingManager {
  constructor() {
    this.createOverlay();
  }

  createOverlay() {
    if (!document.getElementById('loadingOverlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'loadingOverlay';
      overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(10px);
                z-index: 9999;
                display: none;
                align-items: center;
                justify-content: center;
            `;

      overlay.innerHTML = `
                <div style="
                    background: var(--glass-bg);
                    backdrop-filter: blur(20px);
                    border: 1px solid var(--glass-border);
                    border-radius: 16px;
                    padding: 40px;
                    text-align: center;
                    box-shadow: var(--glass-shadow);
                ">
                    <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <div style="margin-top: 20px; color: var(--bs-body-color); font-weight: 600;">
                        Loading...
                    </div>
                </div>
            `;

      document.body.appendChild(overlay);
    }
  }

  show(message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    const messageDiv = overlay.querySelector('div:last-child');
    messageDiv.textContent = message;
    overlay.style.display = 'flex';
  }

  hide() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = 'none';
  }
}

// API Helper
class StudentAPI {
  constructor() {
    this.baseURL = '';
    this.loadingManager = new StudentLoadingManager();
    this.notifications = new StudentNotifications();
  }

  async request(url, options = {}) {
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    };

    const config = { ...defaultOptions, ...options };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async post(url, data) {
    return this.request(url, {
      method: 'POST',
      body: data,
    });
  }

  async get(url) {
    return this.request(url, {
      method: 'GET',
    });
  }
}

// Utility Functions
const StudentUtils = {
  // Debounce function
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle function
  throttle(func, limit) {
    let inThrottle;
    return function () {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  // Format date
  formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  },

  // Format time
  formatTime(date) {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  },

  // Generate random ID
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  },
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize theme manager
  window.studentTheme = new StudentThemeManager();

  // Initialize navigation
  window.studentNavigation = new StudentNavigation();

  // Initialize notifications
  window.studentNotifications = new StudentNotifications();

  // Initialize API helper
  window.studentAPI = new StudentAPI();

  console.log('Student portal initialized successfully');
});

// Export for use in other modules
window.StudentCommon = {
  ThemeManager: StudentThemeManager,
  Navigation: StudentNavigation,
  Notifications: StudentNotifications,
  LoadingManager: StudentLoadingManager,
  API: StudentAPI,
  Utils: StudentUtils,
};
