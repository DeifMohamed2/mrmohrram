/**
 * Student Dashboard JavaScript - Redesigned with new flow
 */

class StudentDashboard {
  constructor() {
    this.selectedYear = null;
    this.init();
  }

  init() {
    this.initializeElements();
    this.bindEvents();
    this.initializeMathBackground();
    this.initializeAnimations();
    this.loadUserProgress();
    this.setupYearRestrictions();
  }

  initializeElements() {
    this.yearCards = document.querySelectorAll('.year-card');
    this.learningTypeSection = document.getElementById('learningTypeSelectionSection');
    this.learningContentAccessSection = document.getElementById('learningContentAccessSection');
    this.pastPapersSection = document.getElementById('pastPapersSection');
    this.weeksSection = document.getElementById('weeksSection');
    this.continueToContentBtn = document.getElementById('continueToContent');
    this.backToTypeDisplayBtn = document.getElementById('backToTypeDisplay');
    this.goToWeeksBtn = document.getElementById('goToWeeks');
    this.backToPapersBtn = document.getElementById('backToPapers');
    this.yearCardsContainer = document.getElementById('yearCardsContainer');
    this.paperCards = document.querySelectorAll('.paper-sub-card');
    this.weekCards = document.querySelectorAll('.week-card');
    this.accessPastPapersBtn = document.getElementById('accessPastPapers');
    this.accessWeeksBtn = document.getElementById('accessWeeks');
  }

  setupYearRestrictions() {
    const currentUser = window.studentData || {};
    const userYear = currentUser.year;

    // Only enable the user's registered year, disable others
    this.yearCards.forEach((card) => {
      const cardYear = card.dataset.year;
      if (cardYear !== userYear) {
        card.classList.add('disabled');

        // Update the button text and disable it
        const selectBtn = card.querySelector('.select-year-btn');
        if (selectBtn) {
          selectBtn.disabled = true;
          selectBtn.innerHTML = `
            <span>Not Available</span>
            <i class="fas fa-lock"></i>
          `;
        }

        // Update progress to 0 for disabled years
        const progressFill = card.querySelector('.progress-fill');
        const progressText = card.querySelector('.progress-text');
        if (progressFill && progressText) {
          progressFill.style.width = '0%';
          progressText.textContent = 'Not Available';
        }
      } else {
        // Enable the user's year
        card.classList.remove('disabled');
        const selectBtn = card.querySelector('.select-year-btn');
        if (selectBtn) {
          selectBtn.disabled = false;
        }
      }
    });
  }

  bindEvents() {
    // Year card selection
    this.yearCards.forEach((card) => {
      card.addEventListener('click', (e) => this.handleYearSelection(e));
    });

    // Navigation buttons
    if (this.continueToContentBtn) {
      this.continueToContentBtn.addEventListener('click', () =>
        this.showPastPapers()
      );
    }

    if (this.backToTypeDisplayBtn) {
      this.backToTypeDisplayBtn.addEventListener('click', () =>
        this.showLearningContentAccess()
      );
    }

    if (this.goToWeeksBtn) {
      this.goToWeeksBtn.addEventListener('click', () => this.showWeeks());
    }

    if (this.backToPapersBtn) {
      this.backToPapersBtn.addEventListener('click', () =>
        this.showPastPapers()
      );
    }
    
    // Additional back navigation buttons
    const backToYearSelectionBtn = document.getElementById('backToYearSelection');
    if (backToYearSelectionBtn) {
      backToYearSelectionBtn.addEventListener('click', () => {
        const yearSelectionSection = document.getElementById('yearSelectionSection');
        if (yearSelectionSection) {
          this.hideAllSections();
          yearSelectionSection.style.display = 'block';
          yearSelectionSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    const backToLearningTypeSelectionBtn = document.getElementById('backToLearningTypeSelection');
    if (backToLearningTypeSelectionBtn) {
      backToLearningTypeSelectionBtn.addEventListener('click', () => {
        this.showLearningType();
      });
    }
    
    // Back to paper types button
    document.querySelectorAll('.back-to-types-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        // Show the sub-cards and hide individual papers
        const subContainer = document.querySelector('.papers-sub-container');
        const individualContainer = document.querySelector('.individual-papers-container');
        
        if (subContainer) subContainer.style.display = 'block';
        if (individualContainer) individualContainer.style.display = 'none';
      });
    });

    // Access content buttons
    if (this.accessPastPapersBtn) {
      this.accessPastPapersBtn.addEventListener('click', () => {
        this.showPastPapers();
      });
    }

    if (this.accessWeeksBtn) {
      this.accessWeeksBtn.addEventListener('click', () => {
        this.showWeeks();
      });
    }

    // Select buttons in cards
    document.querySelectorAll('.select-year-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.year-card');
        this.handleYearSelection({ currentTarget: card });
      });
    });
    
    // Learning type selection buttons
    document.querySelectorAll('.select-learning-type-btn:not(.disabled)').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const learningType = btn.getAttribute('data-type');
        
        // Store selected learning type
        window.selectedLearningType = learningType;
        
        // Show content access section
        this.showLearningContentAccess();
      });
    });

    // Paper card clicks
    this.paperCards.forEach((card) => {
      card.addEventListener('click', (e) => this.handlePaperSelection(e));
    });

    // Paper type selection buttons
    document.querySelectorAll('.access-sub-paper-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const paperType = btn.textContent.trim().replace('Access ', '');
        this.showPapersForType(paperType);
      });
    });

    // Week card clicks
    this.weekCards.forEach((card) => {
      card.addEventListener('click', (e) => this.handleWeekSelection(e));
    });
  }

  handleYearSelection(e) {
    const selectedCard = e.currentTarget;
    const year = selectedCard.dataset.year;
    const currentUser = window.studentData || {};

    // Check if card is disabled
    if (selectedCard.classList.contains('disabled')) {
      this.showNotification(
        `You are registered for ${currentUser.year}. Only your registered year is available!`,
        'warning'
      );
      return;
    }

    // Check if this is not the user's registered year
    if (year !== currentUser.year) {
      this.showNotification(
        `You are registered for ${currentUser.year}. Please select your registered year only!`,
        'warning'
      );
      return;
    }

    this.selectedYear = year;

    // Update visual state
    this.updateYearCards(selectedCard);

    // If student already has a type, skip to content access
    if (currentUser.studentType) {
      this.showLearningContentAccess();
    } else {
      // Show learning type selection
      this.showLearningType();
    }
  }

  updateYearCards(selectedCard) {
    // Remove previous selections
    this.yearCards.forEach((card) => {
      card.classList.remove('selected');
    });

    // Mark selected card
    selectedCard.classList.add('selected');
  }

  showLearningType() {
    // Hide other sections
    this.hideAllSections();

    // Show learning type section
    if (this.learningTypeSection) {
      this.learningTypeSection.style.display = 'block';

      // Animate the section
      setTimeout(() => {
        this.learningTypeSection.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    }
  }
  
  showLearningContentAccess() {
    // Hide other sections
    this.hideAllSections();

    // Show learning content access section
    if (this.learningContentAccessSection) {
      this.learningContentAccessSection.style.display = 'block';

      // Animate the section
      setTimeout(() => {
        this.learningContentAccessSection.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    }
  }

  showPastPapers() {
    // Hide other sections
    this.hideAllSections();

    // Show past papers section
    if (this.pastPapersSection) {
      this.pastPapersSection.style.display = 'block';

      // Animate the section
      setTimeout(() => {
        this.pastPapersSection.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    }
  }

  showWeeks() {
    // Hide other sections
    this.hideAllSections();

    // Show weeks section
    if (this.weeksSection) {
      this.weeksSection.style.display = 'block';

      // Animate the section
      setTimeout(() => {
        this.weeksSection.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    }
  }

  hideAllSections() {
    if (this.learningTypeSection) {
      this.learningTypeSection.style.display = 'none';
    }
    if (this.learningContentAccessSection) {
      this.learningContentAccessSection.style.display = 'none';
    }
    if (this.pastPapersSection) {
      this.pastPapersSection.style.display = 'none';
    }
    if (this.weeksSection) {
      this.weeksSection.style.display = 'none';
    }
  }

  handlePaperSelection(e) {
    const selectedCard = e.currentTarget;
    const paper = selectedCard.dataset.paper;

    // Add visual feedback
    selectedCard.style.transform = 'scale(0.98)';
    setTimeout(() => {
      selectedCard.style.transform = '';
    }, 150);

    this.showNotification(
      `Loading ${paper.charAt(0).toUpperCase() + paper.slice(1)} papers...`,
      'info'
    );

    // Call the showPapersForType method
    this.showPapersForType(paper);
  }
  
  showPapersForType(paperType) {
    // Make sure we're in the past papers section
    this.showPastPapers();
    
    // Show loading state
    this.showNotification(`Loading ${paperType} papers...`, 'info');
    
    // Hide the sub-cards with animation
    const subContainer = document.querySelector('.papers-sub-container');
    if (subContainer) {
      subContainer.style.opacity = '0';
      subContainer.style.transform = 'translateY(-20px)';
      
      setTimeout(() => {
        subContainer.style.display = 'none';
        
        // Show the individual papers container with animation
        const individualContainer = document.querySelector('.individual-papers-container');
        if (individualContainer) {
          individualContainer.style.display = 'block';
          individualContainer.style.opacity = '0';
          individualContainer.style.transform = 'translateY(20px)';
          
          // Add loading overlay
          let loadingOverlay = document.querySelector('.papers-loading-overlay');
          if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'papers-loading-overlay';
            loadingOverlay.innerHTML = `
              <div class="loading-spinner"></div>
              <p>Loading ${paperType} papers...</p>
            `;
            individualContainer.appendChild(loadingOverlay);
          } else {
            loadingOverlay.style.display = 'flex';
          }
          
          // Filter and show only papers of this type
          setTimeout(() => {
            const paperItems = individualContainer.querySelectorAll('.paper-item');
            let visibleCount = 0;
            
            // Reset all items first
            paperItems.forEach(item => {
              item.style.display = 'none';
              item.style.opacity = '0';
              item.style.transform = 'translateY(20px)';
            });
            
            // Filter and animate items in
            paperItems.forEach((item, index) => {
              const dataPaperType = item.getAttribute('data-paper-type');
              const paperTypeBadge = item.querySelector('.paper-badge.type');
              const badgeText = paperTypeBadge ? paperTypeBadge.textContent.trim() : '';
              
              if (dataPaperType === paperType || badgeText === paperType) {
                setTimeout(() => {
                  item.style.display = 'block';
                  setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                  }, 50);
                }, index * 100);
                visibleCount++;
              }
            });
            
            // Update the subtitle
            const subtitle = individualContainer.querySelector('.papers-subtitle');
            if (subtitle) {
              subtitle.textContent = `Available ${paperType} Papers (${visibleCount} found)`;
            }
            
            // Hide loading overlay
            setTimeout(() => {
              if (loadingOverlay) {
                loadingOverlay.style.opacity = '0';
                setTimeout(() => {
                  loadingOverlay.style.display = 'none';
                }, 300);
              }
              
              // Show container with animation
              individualContainer.style.opacity = '1';
              individualContainer.style.transform = 'translateY(0)';
              
              // Scroll to the individual papers section
              individualContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
              
              if (visibleCount === 0) {
                // Fallback: show all papers if no specific type found
                paperItems.forEach((item, index) => {
                  setTimeout(() => {
                    item.style.display = 'block';
                    setTimeout(() => {
                      item.style.opacity = '1';
                      item.style.transform = 'translateY(0)';
                    }, 50);
                  }, index * 100);
                });
                this.showNotification(`No specific ${paperType} papers found. Showing all available papers.`, 'info');
              } else {
                this.showNotification(`Showing ${visibleCount} ${paperType} papers`, 'success');
              }
            }, 800);
          }, 300);
        }
      }, 300);
    }
  }

  handleWeekSelection(e) {
    const selectedCard = e.currentTarget;
    const weekNumber = selectedCard.dataset.week;
    const weekId = selectedCard.dataset.weekId;
    const weekBtn = selectedCard.querySelector('.week-btn');

    // Check if week is disabled
    if (weekBtn && weekBtn.classList.contains('disabled')) {
      this.showNotification(
        `Week ${weekNumber} is not available yet. Complete previous weeks first!`,
        'warning'
      );
      return;
    }

    // Add visual feedback
    selectedCard.style.transform = 'scale(0.98)';
    setTimeout(() => {
      selectedCard.style.transform = '';
    }, 150);

    this.showNotification(`Loading Week ${weekNumber} content...`, 'info');

    // Navigate to the week content page
    setTimeout(() => {
      window.location.href = `/student/week/${weekId}`;
    }, 500);
  }

  animateProgressBars() {
    const progressFills = document.querySelectorAll('.progress-fill');
    progressFills.forEach((fill, index) => {
      const card = fill.closest('.year-card');
      if (!card.classList.contains('disabled')) {
        // Animate the selected year's progress
        const currentWidth = parseInt(fill.style.width) || 0;
        const targetWidth = this.getYearProgress(card.dataset.year);
        this.animateValue(fill, currentWidth, targetWidth, 1000, (value) => {
          fill.style.width = value + '%';
          const progressText = fill
            .closest('.card-progress')
            .querySelector('.progress-text');
          progressText.textContent = Math.round(value) + '% Complete';
        });
      }
    });
  }

  getYearProgress(year) {
    // Mock progress data - replace with real data from API
    const progressData = {
      'Year 8': 65,
      'Year 9': 40,
      'Year 10': 25,
    };
    return progressData[year] || 0;
  }

  // Animation helper method
  animateValue(element, start, end, duration, callback) {
    const startTime = performance.now();
    const change = end - start;

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = start + change * easeOut;

      callback(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }

  loadUserProgress() {
    // Load user's current progress and selections
    // This would typically come from an API call
    const currentUser = window.studentData || {};

    if (currentUser.year) {
      // Pre-select the user's current year
      const userYearCard = document.querySelector(
        `[data-year="${currentUser.year}"]`
      );
      if (userYearCard) {
        setTimeout(() => {
          userYearCard.classList.add('selected');
        }, 500);
      }
    }
  }

  initializeMathBackground() {
    // Create floating math elements if they don't exist
    if (!document.querySelector('.floating-math-elements')) {
      this.createMathBackground();
    }

    // Start animation
    this.animateMathElements();
  }

  createMathBackground() {
    const mathContainer = document.createElement('div');
    mathContainer.className = 'math-background-container';

    const floatingElements = document.createElement('div');
    floatingElements.className = 'floating-math-elements';

    const mathSymbols = [
      'π',
      '∑',
      '∫',
      '√',
      '∞',
      'α',
      'β',
      'θ',
      'Δ',
      'λ',
      '∂',
      '≈',
      '≠',
      '≤',
      '≥',
    ];

    mathSymbols.forEach((symbol, index) => {
      const element = document.createElement('div');
      element.className = 'math-element';
      element.textContent = symbol;
      element.dataset.equation = symbol;

      // Random positioning
      element.style.left = Math.random() * 100 + '%';
      element.style.top = Math.random() * 100 + '%';
      element.style.animationDelay = Math.random() * 15 + 's';

      floatingElements.appendChild(element);
    });

    mathContainer.appendChild(floatingElements);
    document.body.appendChild(mathContainer);
  }

  animateMathElements() {
    const mathElements = document.querySelectorAll('.math-element');
    mathElements.forEach((element, index) => {
      // Add floating animation with random delays
      element.style.animationDelay = Math.random() * 15 + 's';
    });
  }

  initializeAnimations() {
    // Initialize AOS (Animate On Scroll) if available
    if (typeof AOS !== 'undefined') {
      AOS.init({
        duration: 800,
        easing: 'ease-out-cubic',
        once: true,
        offset: 100,
      });
    }

    // Add entrance animations
    this.addEntranceAnimations();
  }

  addEntranceAnimations() {
    // Add staggered entrance animations to cards
    const cards = document.querySelectorAll('.year-card, .mode-card');
    cards.forEach((card, index) => {
      setTimeout(() => {
        card.classList.add('fade-in');
      }, index * 150);
    });
  }

  showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach((notification) => {
      notification.remove();
    });

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;

    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-${this.getNotificationIcon(type)}"></i>
        <span>${message}</span>
      </div>
    `;

    // Add to DOM
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    // Auto remove
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  getNotificationIcon(type) {
    const icons = {
      success: 'check-circle',
      error: 'times-circle',
      warning: 'exclamation-triangle',
      info: 'info-circle',
    };
    return icons[type] || 'info-circle';
  }
}

// Notification CSS (inject into page)
const notificationCSS = `
  .notification {
    position: fixed;
    top: 100px;
    right: 20px;
    background: rgba(255, 255, 255, 0.95);
    border-left: 4px solid var(--math-primary);
    border-radius: 8px;
    padding: 16px 20px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    z-index: 10000;
    transform: translateX(120%);
    transition: all 0.3s ease;
    max-width: 350px;
    min-width: 250px;
  }

  .dark-theme .notification {
    background: rgba(31, 41, 55, 0.95);
    color: var(--math-text);
  }

  .notification.show {
    transform: translateX(0);
  }

  .notification-content {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .notification-success {
    border-left-color: var(--math-success);
  }

  .notification-error {
    border-left-color: var(--math-danger);
  }

  .notification-warning {
    border-left-color: var(--math-warning);
  }

  .notification-success i {
    color: var(--math-success);
  }

  .notification-error i {
    color: var(--math-danger);
  }

  .notification-warning i {
    color: var(--math-warning);
  }

  .notification-info i {
    color: var(--math-primary);
  }

  .pulse-animation {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(30, 64, 175, 0.7);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(30, 64, 175, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(30, 64, 175, 0);
    }
  }
`;

// Inject notification CSS
const style = document.createElement('style');
style.textContent = notificationCSS;
document.head.appendChild(style);

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Add body class for styling
  document.body.classList.add('student-dashboard');

  // Initialize theme manager if not already initialized
  if (!window.themeManager) {
    // Import and initialize theme manager
    const script = document.createElement('script');
    script.src = '/js/theme-manager.js';
    script.onload = () => {
      if (window.ThemeManager) {
        window.themeManager = new window.ThemeManager();
      }
    };
    document.head.appendChild(script);
  }

  // Initialize dashboard
  window.studentDashboard = new StudentDashboard();
});

// Handle theme changes
document.addEventListener('themeChanged', (e) => {
  // Re-initialize animations if needed
  const dashboard = window.studentDashboard;
  if (dashboard) {
    dashboard.animateMathElements();
  }
});
