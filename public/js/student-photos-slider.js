/**
 * Enhanced Student Photos Slider
 * Dynamically loads and displays student photos with modern design and dark/light mode support
 */

class StudentPhotosSlider {
  constructor() {
    this.currentPosition = 0;
    this.slides = [];
    this.slideWidth = 350; // Card width + gap
    this.visibleSlides = 3;
    this.maxPosition = 0;
    this.isAnimating = false;
    this.autoPlayInterval = null;
    this.autoPlayDelay = 1000; // 1 second for very smooth auto-sliding
    this.isAutoPlayEnabled = true; // Always enabled
    this.isHovering = false;
    
    this.init();
  }

  async init() {
    try {
      await this.loadStudentPhotos();
      this.createSlider();
      this.setupEventListeners();
      this.createPagination();
      this.startAutoPlay();
    } catch (error) {
      console.error('Error initializing student photos slider:', error);
      this.showFallbackContent();
    }
  }

  async loadStudentPhotos() {
    // List of actual photos in your Slider Images folder
    const photoFiles = [
      'PHOTO-2025-09-05-19-40-15.jpg',
      'PHOTO-2025-09-05-19-40-14.jpg',
      'PHOTO-2025-09-05-19-40-14 3.jpg',
      'PHOTO-2025-09-05-19-40-14 2.jpg',
      'PHOTO-2025-09-05-18-48-25.jpg',
      'PHOTO-2025-09-05-18-48-24.jpg',
      'PHOTO-2025-09-05-18-48-24 4.jpg',
      'PHOTO-2025-09-05-18-48-24 3.jpg',
      'PHOTO-2025-09-05-18-48-24 2.jpg',
      'PHOTO-2025-09-05-18-48-22.jpg',
      'PHOTO-2025-09-05-18-48-22 2.jpg',
      'PHOTO-2025-09-05-18-48-21.jpg',
      'PHOTO-2025-09-05-18-48-21 2.jpg'
    ];

    // Sample student names and data
    const studentNames = [
      'Ahmed Mohamed', 'Sara Ali', 'Omar Hassan', 'Fatima Ibrahim',
      'Youssef Mahmoud', 'Nour El-Din', 'Mariam Ahmed', 'Khalid Hassan',
      'Amina Youssef', 'Mohamed Ali', 'Layla Hassan', 'Tariq Ibrahim',
      'Zainab Mohamed'
    ];

    const years = ['Year 8', 'Year 9', 'Year 10'];
    const subjects = ['Mathematics', 'Algebra', 'Geometry', 'Calculus', 'Statistics', 'Trigonometry'];
    const achievements = ['Top Performer', 'Most Improved', 'Perfect Score', 'Math Champion', 'Problem Solver', 'Rising Star', 'Future Engineer', 'Math Genius', 'Quick Learner'];

    // Create student data from your actual photos
    this.slides = photoFiles.map((photo, index) => ({
      id: index + 1,
      name: studentNames[index] || `Student ${index + 1}`,
      year: years[index % years.length],
      subject: subjects[index % subjects.length],
      image: `/Slider Images/${photo}`,
      achievement: achievements[index % achievements.length]
    }));

    // Shuffle the slides array to create variety
    this.shuffleArray(this.slides);
  }

  // Fisher-Yates shuffle algorithm
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  createSlider() {
    const slider = document.getElementById('studentPhotosSlider');

    if (!slider) return;

    // Clear existing content
    slider.innerHTML = '';

    // Create a single continuous slide with all photos
    const slidesContainer = document.createElement('div');
    slidesContainer.className = 'slides-container';
    
    // Create all student photos with enhanced design - no text content
    slidesContainer.innerHTML = this.slides.map(student => `
      <div class="student-photo-card" data-aos="fade-up">
        <div class="student-photo">
          <img src="${student.image}" alt="Student" loading="lazy" onerror="this.src='/images/default-student.jpg'">
          <div class="photo-glow"></div>
        </div>
      </div>
    `).join('');

    slider.appendChild(slidesContainer);
    this.slidesContainer = slidesContainer;

    // Calculate max position based on number of slides
    this.maxPosition = Math.max(0, this.slides.length - this.visibleSlides);
    this.slideWidth = 350 + 40; // Card width + gap

    // Update button states
    this.updateButtonStates();
  }

  // Grid function removed as we're only using the slider

  createPagination() {
    const paginationContainer = document.getElementById('sliderPagination');
    
    if (!paginationContainer) return;
    
    // Clear existing content
    paginationContainer.innerHTML = '';
    
    // Calculate number of pages
    const pageCount = Math.ceil(this.slides.length / this.visibleSlides);
    
    // Create pagination dots
    for (let i = 0; i < pageCount; i++) {
      const dot = document.createElement('div');
      dot.className = 'pagination-dot';
      if (i === 0) dot.classList.add('active');
      
      dot.addEventListener('click', () => {
        this.goToPosition(i * this.visibleSlides);
      });
      
      paginationContainer.appendChild(dot);
    }
  }

  setupEventListeners() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const slider = document.getElementById('studentPhotosSlider');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.previousSlide();
        // Temporarily pause autoplay when manually navigating
        this.pauseAutoPlay();
        setTimeout(() => {
          if (this.isAutoPlayEnabled && !this.isHovering) {
            this.startAutoPlay();
          }
        }, 3000);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.nextSlide();
        // Temporarily pause autoplay when manually navigating
        this.pauseAutoPlay();
        setTimeout(() => {
          if (this.isAutoPlayEnabled && !this.isHovering) {
            this.startAutoPlay();
          }
        }, 3000);
      });
    }

    // Pause on hover
    if (slider) {
      slider.addEventListener('mouseenter', () => {
        this.isHovering = true;
        this.pauseAutoPlay();
      });
      
      slider.addEventListener('mouseleave', () => {
        this.isHovering = false;
        if (this.isAutoPlayEnabled) {
          this.startAutoPlay();
        }
      });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        this.previousSlide();
        this.pauseAutoPlay();
        setTimeout(() => {
          if (this.isAutoPlayEnabled && !this.isHovering) {
            this.startAutoPlay();
          }
        }, 3000);
      } else if (e.key === 'ArrowRight') {
        this.nextSlide();
        this.pauseAutoPlay();
        setTimeout(() => {
          if (this.isAutoPlayEnabled && !this.isHovering) {
            this.startAutoPlay();
          }
        }, 3000);
      }
    });

    // Touch/swipe support
    this.setupTouchEvents();
  }
  
  // Auto-play toggle removed as requested

  setupTouchEvents() {
    const slider = document.getElementById('studentPhotosSlider');
    if (!slider) return;

    let startX = 0;
    let endX = 0;

    slider.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      this.pauseAutoPlay();
    });

    slider.addEventListener('touchend', (e) => {
      endX = e.changedTouches[0].clientX;
      this.handleSwipe(startX, endX);
      
      // Resume autoplay after a short delay
      setTimeout(() => {
        if (this.isAutoPlayEnabled && !this.isHovering) {
          this.startAutoPlay();
        }
      }, 1000);
    });
  }

  handleSwipe(startX, endX) {
    const threshold = 50;
    const diff = startX - endX;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        this.nextSlide();
      } else {
        this.previousSlide();
      }
    }
  }

  goToPosition(position) {
    if (position < 0 || position > this.maxPosition || this.isAnimating) return;
    
    this.isAnimating = true;
    this.currentPosition = position;
    this.updateSliderPosition();
    this.updateButtonStates();
    this.updatePagination();
    
    setTimeout(() => {
      this.isAnimating = false;
    }, 600);
  }

  nextSlide() {
    if (this.isAnimating || this.currentPosition >= this.maxPosition) return;
    
    this.isAnimating = true;
    this.currentPosition++;
    this.updateSliderPosition();
    this.updateButtonStates();
    this.updatePagination();
    
    setTimeout(() => {
      this.isAnimating = false;
    }, 600);
  }

  previousSlide() {
    if (this.isAnimating || this.currentPosition <= 0) return;
    
    this.isAnimating = true;
    this.currentPosition--;
    this.updateSliderPosition();
    this.updateButtonStates();
    this.updatePagination();
    
    setTimeout(() => {
      this.isAnimating = false;
    }, 600);
  }

  updateSliderPosition() {
    if (!this.slidesContainer) return;
    
    // Add a smooth class to ensure transitions are always smooth
    this.slidesContainer.classList.add('smooth-transition');
    
    const translateX = -this.currentPosition * this.slideWidth;
    this.slidesContainer.style.transform = `translateX(${translateX}px)`;
    
    // Remove the class after transition completes to avoid affecting other transitions
    setTimeout(() => {
      this.slidesContainer.classList.remove('smooth-transition');
    }, 500);
  }

  updateButtonStates() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const currentSlideElement = document.getElementById('currentSlide');

    if (prevBtn) {
      prevBtn.disabled = this.currentPosition <= 0;
    }

    if (nextBtn) {
      nextBtn.disabled = this.currentPosition >= this.maxPosition;
    }

    if (currentSlideElement) {
      currentSlideElement.textContent = this.currentPosition + 1;
    }
  }

  updatePagination() {
    const dots = document.querySelectorAll('.pagination-dot');
    // Use Math.floor to get the current page even with fractional positions
    const currentPage = Math.floor(this.currentPosition / this.visibleSlides);
    
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index === currentPage);
    });
  }

  startAutoPlay() {
    // Clear any existing interval
    this.pauseAutoPlay();
    
    // Set a new interval with continuous smooth sliding
    this.autoPlayInterval = setInterval(() => {
      if (this.currentPosition >= this.maxPosition) {
        // Smooth transition back to the beginning
        this.smoothResetToStart();
      } else {
        // Advance by just a small amount for super smooth continuous motion
        this.advanceSlider();
      }
    }, this.autoPlayDelay);
  }
  
  advanceSlider() {
    // Only advance if not at the end
    if (this.currentPosition < this.maxPosition) {
      this.currentPosition += 0.2; // Move by a fraction for smoother motion
      this.updateSliderPosition();
      this.updatePagination();
    }
  }
  
  smoothResetToStart() {
    // Add a special class for smooth transition when going back to start
    if (this.slidesContainer) {
      this.slidesContainer.classList.add('smooth-transition');
      
      // Go to position 0 with a smooth transition
      this.currentPosition = 0;
      this.updateSliderPosition();
      this.updatePagination();
      
      // Remove the class after transition completes
      setTimeout(() => {
        this.slidesContainer.classList.remove('smooth-transition');
      }, 800);
    } else {
      // Fallback if slidesContainer is not available
      this.goToPosition(0);
    }
  }

  pauseAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  }

  showFallbackContent() {
    const slider = document.getElementById('studentPhotosSlider');
    
    const fallbackHTML = `
      <div class="fallback-content">
        <div class="fallback-icon">
          <i class="fas fa-users"></i>
        </div>
        <h3>Student Photos Coming Soon</h3>
        <p>We're preparing amazing photos of our students. Check back soon!</p>
      </div>
    `;
    
    if (slider) {
      slider.innerHTML = fallbackHTML;
    }
  }

  destroy() {
    this.pauseAutoPlay();
  }
}

// Initialize the slider when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const slider = new StudentPhotosSlider();
  
  // Handle theme changes to update slider appearance
  document.addEventListener('themeChanged', () => {
    // No need to recreate the slider, CSS handles the theme changes
    console.log('Theme changed, slider adapts automatically');
  });
});

// Export for potential use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StudentPhotosSlider;
}
