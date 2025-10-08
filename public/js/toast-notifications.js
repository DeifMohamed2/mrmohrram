// Toast Notification System
class ToastNotification {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create toast container if it doesn't exist
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    show(message, type = 'info', duration = 5000) {
        const toast = this.createToast(message, type);
        this.container.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                this.remove(toast);
            }, duration);
        }

        return toast;
    }

    createToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = this.getIcon(type);
        const title = this.getTitle(type);

        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">
                    <i class="${icon}"></i>
                </div>
                <div class="toast-body">
                    <div class="toast-title">${title}</div>
                    <div class="toast-message">${message}</div>
                </div>
                <button class="toast-close" onclick="toastNotification.remove(this.parentElement.parentElement)">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="toast-progress"></div>
        `;

        return toast;
    }

    getIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    getTitle(type) {
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Information'
        };
        return titles[type] || titles.info;
    }

    remove(toast) {
        if (toast && toast.parentNode) {
            toast.classList.remove('show');
            toast.classList.add('hide');
            
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }

    success(message, duration = 5000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 7000) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = 6000) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 5000) {
        return this.show(message, 'info', duration);
    }
}

// Initialize toast notification system
const toastNotification = new ToastNotification();

// Global functions for easy access
function showToast(message, type = 'info', duration = 5000) {
    return toastNotification.show(message, type, duration);
}

function showSuccess(message, duration = 5000) {
    return toastNotification.success(message, duration);
}

function showError(message, duration = 7000) {
    return toastNotification.error(message, duration);
}

function showWarning(message, duration = 6000) {
    return toastNotification.warning(message, duration);
}

function showInfo(message, duration = 5000) {
    return toastNotification.info(message, duration);
}

// Export for use in other scripts
window.toastNotification = toastNotification;
window.showToast = showToast;
window.showSuccess = showSuccess;
window.showError = showError;
window.showWarning = showWarning;
window.showInfo = showInfo;
