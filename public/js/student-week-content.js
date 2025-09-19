/**
 * Student Week Content JavaScript
 */

class StudentWeekContent {
  constructor() {
    this.weekData = window.weekData;
    this.studentData = window.studentData;
    this.materials = [];
    this.homeworkSubmissions = [];
    this.studentProgress = null;
    this.currentFilter = 'all';
    this.loading = false;
    
    console.log('StudentWeekContent initialized with week data:', this.weekData);
    console.log('StudentWeekContent initialized with student data:', this.studentData);
    
    this.init();
  }

  init() {
    this.initializeElements();
    this.bindEvents();
    this.loadWeekContent();
    this.initializeMathBackground();
    this.initializeAnimations();
  }

  initializeElements() {
    this.materialsList = document.getElementById('materialsList');
    this.filterButtons = document.querySelectorAll('.filter-btn');
    this.homeworkModal = document.getElementById('homeworkModal');
    this.contentModal = document.getElementById('contentModal');
    this.homeworkForm = document.getElementById('homeworkForm');
    this.fileUploadArea = document.getElementById('fileUploadArea');
    this.filePreview = document.getElementById('filePreview');
    this.fileInput = document.getElementById('homeworkFile');
  }

  bindEvents() {
    // Filter buttons
    this.filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleFilter(e));
    });

    // File upload
    this.fileUploadArea.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    this.fileUploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.fileUploadArea.addEventListener('drop', (e) => this.handleDrop(e));
  }

  initializeMathBackground() {
    const mathElements = document.querySelectorAll('.math-element');
    mathElements.forEach((element, index) => {
      element.style.animationDelay = `${index * 0.5}s`;
    });
  }

  initializeAnimations() {
    // Initialize AOS animations
    if (typeof AOS !== 'undefined') {
      AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true
      });
    }
  }

  async loadWeekContent() {
    // Prevent multiple simultaneous requests
    if (this.loading) {
      console.log('Already loading, skipping request');
      return;
    }
    
    try {
      this.loading = true;
      this.showLoading();
      
      console.log('Loading week content for week ID:', this.weekData.id);
      const response = await fetch(`/student/api/weeks/${this.weekData.id}/content`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('API response:', result);
      
      if (result.success) {
        this.materials = result.materials || [];
        this.homeworkSubmissions = result.homeworkSubmissions || [];
        this.studentProgress = result.studentProgress || null;
        console.log('API Response:', result);
        console.log('Loaded materials:', this.materials.length);
        console.log('Materials data:', this.materials);
        console.log('Loaded homework submissions:', this.homeworkSubmissions.length);
        console.log('Loaded student progress:', this.studentProgress);
        
        // Force update all UI elements
        this.renderMaterials();
        this.updateStats();
        this.updateProgress();
        this.updateDeadlines();
        
        // If no materials, show a friendly empty state
        if (this.materials.length === 0) {
          console.warn('No materials found for this week');
          this.showEmptyState();
        }
      } else {
        console.error('API returned error:', result.message);
        this.showError(result.message || 'Failed to load week content');
      }
    } catch (error) {
      console.error('Error loading week content:', error);
      this.showError('Error loading week content: ' + error.message);
    } finally {
      this.loading = false;
    }
  }

  renderMaterials() {
    if (this.materials.length === 0) {
      this.showEmptyState();
      return;
    }

    const filteredMaterials = this.getFilteredMaterials();
    
    this.materialsList.innerHTML = filteredMaterials.map(material => 
      this.createMaterialCard(material)
    ).join('');

    // Add event listeners to material cards
    this.addMaterialEventListeners();
    
    // Start countdown timers for homework
    this.startCountdownTimers();
  }

  getFilteredMaterials() {
    if (this.currentFilter === 'all') {
      return this.materials;
    }
    return this.materials.filter(material => material.type === this.currentFilter);
  }

  createMaterialCard(material) {
    const status = this.getMaterialStatus(material);
    const iconClass = this.getMaterialIcon(material.type);
    const statusClass = this.getStatusClass(status);
    
    // Generate countdown timer for homework or submission status
    let countdownTimer = '';
    if (material.type === 'homework') {
      countdownTimer = this.createCountdownTimer(material);
    }
    
    return `
      <div class="material-card fade-in" data-type="${material.type}" data-material-id="${material._id}">
        <div class="material-header">
          <div class="material-icon ${material.type}">
            <i class="${iconClass}"></i>
          </div>
          <div class="material-info">
            <h3 class="material-title">${material.title}</h3>
            <div class="material-meta">
              <span>${material.estimatedTime || 30} min</span>
              <span>•</span>
              <span>${material.maxScore || 100} points</span>
              ${material.dueDate ? `<span>•</span><span>Due: ${new Date(material.dueDate).toLocaleDateString()}</span>` : ''}
            </div>
          </div>
          <div class="material-status ${statusClass}">
            ${this.getStatusText(status)}
          </div>
        </div>
        
        ${material.description ? `<p class="material-description">${material.description}</p>` : ''}
        
        ${countdownTimer}
        
        <div class="material-actions">
          ${this.createMaterialActions(material, status)}
        </div>
      </div>
    `;
  }

  getMaterialStatus(material) {
    if (material.type === 'homework') {
      const submission = this.homeworkSubmissions.find(sub => {
        const matchesId = sub.materialId === material._id;
        const matchesOriginalId = material.originalMaterialId && sub.materialId === material.originalMaterialId;
        
        // Also check if the submission materialId matches the actual material ID (without week-material- prefix)
        let actualMaterialId = material._id;
        if (material._id.startsWith('week-material-')) {
          actualMaterialId = material._id.replace('week-material-', '');
        }
        const matchesActualId = sub.materialId === actualMaterialId;
        
        return matchesId || matchesActualId || matchesOriginalId;
      });
      
      if (submission) {
        if (submission.status === 'graded') return 'completed';
        if (submission.status === 'submitted') return 'submitted';
        return 'pending';
      }
      
      // Check if homework is overdue using dueDateTime
      if (material.dueDateTime && new Date(material.dueDateTime) < new Date()) {
        return 'overdue';
      }
      
      return material.isRequired ? 'required' : 'optional';
    }
    
    // For non-homework materials, check if they're completed
    if (this.studentProgress && this.studentProgress.completedMaterials) {
      // Check both the full ID and the original material ID
      let actualMaterialId = material._id;
      if (material._id.startsWith('week-material-')) {
        actualMaterialId = material._id.replace('week-material-', '');
      }
      
      if (this.studentProgress.completedMaterials.includes(material._id) ||
          this.studentProgress.completedMaterials.includes(actualMaterialId) ||
          (material.originalMaterialId && this.studentProgress.completedMaterials.includes(material.originalMaterialId))) {
        return 'completed';
      }
    }
    
    return 'available';
  }

  createCountdownTimer(material) {
    // Check if this specific homework has been submitted
    const submission = this.homeworkSubmissions.find(sub => {
      const matchesId = sub.materialId === material._id;
      const matchesOriginalId = material.originalMaterialId && sub.materialId === material.originalMaterialId;
      
      // Also check if the submission materialId matches the actual material ID (without week-material- prefix)
      let actualMaterialId = material._id;
      if (material._id.startsWith('week-material-')) {
        actualMaterialId = material._id.replace('week-material-', '');
      }
      const matchesActualId = sub.materialId === actualMaterialId;
      
      return matchesId || matchesActualId || matchesOriginalId;
    });
    
    // If this specific homework is submitted, show success message instead of timer
    if (submission && (submission.status === 'submitted' || submission.status === 'graded')) {
      const submissionDate = new Date(submission.submittedAt || submission.createdAt);
      return `
        <div class="countdown-timer completed">
          <div class="timer-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <div class="timer-content">
            <div class="timer-label">Homework Submitted</div>
            <div class="timer-message">
              Successfully submitted on ${submissionDate.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            ${submission.status === 'graded' ? `
              <div class="timer-grade">
                <span class="grade-label">Grade:</span>
                <span class="grade-value">${submission.grade || 'Pending'}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }
    
    const dueDateTime = new Date(material.dueDateTime);
    const now = new Date();
    const timeDiff = dueDateTime - now;
    
    if (timeDiff <= 0) {
      return `
        <div class="countdown-timer expired">
          <div class="timer-icon">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <div class="timer-content">
            <div class="timer-label">Assignment Overdue</div>
            <div class="timer-message">
              ${material.allowLateSubmission ? 
                'Late submissions are allowed with penalty' : 
                'No late submissions accepted'
              }
            </div>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="countdown-timer active" data-due-date="${material.dueDateTime}">
        <div class="timer-icon">
          <i class="fas fa-clock"></i>
        </div>
        <div class="timer-content">
          <div class="timer-label">Time Remaining</div>
          <div class="timer-display" id="timer-${material._id}">
            <div class="timer-unit">
              <span class="timer-number" id="days-${material._id}">0</span>
              <span class="timer-text">Days</span>
            </div>
            <div class="timer-unit">
              <span class="timer-number" id="hours-${material._id}">0</span>
              <span class="timer-text">Hours</span>
            </div>
            <div class="timer-unit">
              <span class="timer-number" id="minutes-${material._id}">0</span>
              <span class="timer-text">Minutes</span>
            </div>
            <div class="timer-unit">
              <span class="timer-number" id="seconds-${material._id}">0</span>
              <span class="timer-text">Seconds</span>
            </div>
          </div>
          <div class="timer-due-date">
            Due: ${dueDateTime.toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      </div>
    `;
  }

  getMaterialIcon(type) {
    const icons = {
      notes: 'fas fa-sticky-note',
      homework: 'fas fa-homework',
      pdf: 'fas fa-file-pdf',
      'el-5olasa': 'fas fa-file-contract'
    };
    return icons[type] || 'fas fa-file';
  }

  getStatusClass(status) {
    const classes = {
      required: 'required',
      optional: 'optional',
      completed: 'completed',
      submitted: 'completed',
      pending: 'pending',
      overdue: 'overdue',
      available: 'optional'
    };
    return classes[status] || 'optional';
  }

  getStatusText(status) {
    const texts = {
      required: 'Required',
      optional: 'Optional',
      completed: 'Completed',
      submitted: 'Submitted',
      pending: 'Pending',
      overdue: 'Overdue',
      available: 'Available'
    };
    return texts[status] || 'Available';
  }

  createMaterialActions(material, status) {
    const actions = [];
    
    // View/Download button
    if (material.fileUrl) {
      // Check if it's a PDF file to show "View" instead of "Download"
      const isPDF = material.type === 'pdf' || material.type === 'el-5olasa' || 
                    material.fileType === 'application/pdf' || 
                    (material.fileName && material.fileName.toLowerCase().endsWith('.pdf'));
      
      actions.push(`
        <button class="btn btn-primary" onclick="viewContent('${material._id}', '${material.type}')">
          <i class="fas fa-eye"></i>
          ${isPDF ? 'View' : 'Download'}
        </button>
      `);
    }
    
    // Homework specific actions
    if (material.type === 'homework') {
      if (status === 'required' || status === 'optional') {
        // Check if the due date has passed but not yet marked as overdue
        const isDueDatePassed = material.dueDateTime && new Date(material.dueDateTime) < new Date();
        
        if (isDueDatePassed && !material.allowLateSubmission) {
          // Due date passed and late submissions not allowed - don't show submit button
          actions.push(`
            <button class="btn btn-secondary" disabled title="Assignment deadline has passed. Late submissions not allowed.">
              <i class="fas fa-ban"></i>
              Deadline Passed
            </button>
          `);
        } else {
          actions.push(`
            <button class="btn btn-warning" onclick="openHomeworkModal('${material._id}')">
              <i class="fas fa-upload"></i>
              Submit
            </button>
          `);
        }
      } else if (status === 'overdue') {
        // Check if late submission is allowed
        if (material.allowLateSubmission) {
          actions.push(`
            <button class="btn btn-warning" onclick="openHomeworkModal('${material._id}')" title="Late submission allowed with penalty">
              <i class="fas fa-upload"></i>
              Submit Late
            </button>
          `);
        } else {
          // Don't show any button for overdue assignments when late submissions are not allowed
        }
      } else if (status === 'submitted' || status === 'completed') {
        actions.push(`
          <button class="btn btn-success" onclick="viewSubmission('${material._id}')">
            <i class="fas fa-check"></i>
            View Submission
          </button>
        `);
      }
    }
    
    return actions.join('');
  }

  addMaterialEventListeners() {
    // Add any additional event listeners for material cards
  }

  startCountdownTimers() {
    // Clear any existing timers
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    
    // Start the countdown timer
    this.countdownInterval = setInterval(() => {
      this.updateCountdownTimers();
    }, 1000);
    
    // Initial update
    this.updateCountdownTimers();
  }

  updateCountdownTimers() {
    const homeworkMaterials = this.materials.filter(m => m.type === 'homework' && m.dueDateTime);
    
    homeworkMaterials.forEach(material => {
      // Skip if this specific homework has been submitted
      const submission = this.homeworkSubmissions.find(sub => 
        sub.materialId === material._id || 
        (material.originalMaterialId && sub.materialId === material.originalMaterialId)
      );
      
      if (submission && (submission.status === 'submitted' || submission.status === 'graded')) {
        return; // Skip updating timer for submitted homework
      }
      
      const timerElement = document.getElementById(`timer-${material._id}`);
      if (!timerElement) return;
      
      const dueDateTime = new Date(material.dueDateTime);
      const now = new Date();
      const timeDiff = dueDateTime - now;
      
      if (timeDiff <= 0) {
        // Assignment is overdue
        const countdownContainer = timerElement.closest('.countdown-timer');
        if (countdownContainer) {
          countdownContainer.className = 'countdown-timer expired';
          countdownContainer.innerHTML = `
            <div class="timer-icon">
              <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="timer-content">
              <div class="timer-label">Assignment Overdue</div>
              <div class="timer-message">
                ${material.allowLateSubmission ? 
                  'Late submissions are allowed with penalty' : 
                  'No late submissions accepted'
                }
              </div>
            </div>
          `;
          
          // If late submission is not allowed, hide the submit button
          if (!material.allowLateSubmission) {
            const materialCard = document.querySelector(`[data-material-id="${material._id}"]`);
            if (materialCard) {
              const submitButton = materialCard.querySelector('.btn-warning');
              if (submitButton) {
                submitButton.style.display = 'none';
              }
            }
          }
        }
        return;
      }
      
      // Calculate time remaining
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
      
      // Update timer display
      const daysElement = document.getElementById(`days-${material._id}`);
      const hoursElement = document.getElementById(`hours-${material._id}`);
      const minutesElement = document.getElementById(`minutes-${material._id}`);
      const secondsElement = document.getElementById(`seconds-${material._id}`);
      
      if (daysElement) daysElement.textContent = days;
      if (hoursElement) hoursElement.textContent = hours;
      if (minutesElement) minutesElement.textContent = minutes;
      if (secondsElement) secondsElement.textContent = seconds;
      
      // Add warning class if less than 24 hours remaining
      const countdownContainer = timerElement.closest('.countdown-timer');
      if (countdownContainer && timeDiff < 24 * 60 * 60 * 1000) {
        countdownContainer.classList.add('warning');
      }
    });
  }

  handleFilter(e) {
    const filter = e.target.dataset.filter;
    
    // Update active filter button
    this.filterButtons.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    
    this.currentFilter = filter;
    this.renderMaterials();
  }

  updateStats() {
    console.log('Updating stats with materials:', this.materials);
    
    const stats = {
      notes: this.materials.filter(m => m.type === 'notes').length,
      homework: this.materials.filter(m => m.type === 'homework').length,
      pdf: this.materials.filter(m => m.type === 'pdf').length,
      summary: this.materials.filter(m => m.type === 'el-5olasa').length
    };
    
    console.log('Stats calculated:', stats);
    
    document.getElementById('notesCount').textContent = stats.notes;
    document.getElementById('homeworkCount').textContent = stats.homework;
    document.getElementById('pdfCount').textContent = stats.pdf;
    document.getElementById('summaryCount').textContent = stats.summary;
    
    // Update total materials
    const totalMaterials = this.materials.length;
    document.getElementById('totalMaterials').textContent = totalMaterials;
    
    // Update total study time
    const totalStudyTime = this.materials.reduce((total, material) => 
      total + (material.estimatedTime || 30), 0
    );
    document.getElementById('totalStudyTime').textContent = 
      Math.round(totalStudyTime / 60 * 10) / 10 + 'h';
      
    console.log('Stats updated - Total materials:', totalMaterials, 'Study time:', totalStudyTime);
  }

  updateProgress() {
    const totalMaterials = this.materials.length;
    console.log('Updating progress - Total materials:', totalMaterials);
    console.log('Student progress:', this.studentProgress);
    
    const completedMaterials = this.materials.filter(material => {
      if (material.type === 'homework') {
        // Homework is only completed when submitted
        const submission = this.homeworkSubmissions.find(sub => 
          sub.materialId === material._id || 
          sub.materialId === material.originalMaterialId ||
          (material.originalMaterialId && sub.materialId === material.originalMaterialId)
        );
        const isCompleted = submission && (submission.status === 'submitted' || submission.status === 'graded');
        console.log(`Homework ${material.title}: ${isCompleted ? 'completed' : 'not completed'}`);
        return isCompleted;
      } else {
        // For non-homework materials (notes, pdf, el-5olasa), check if they're in completedMaterials
        if (this.studentProgress && this.studentProgress.completedMaterials) {
          // Check both the full ID and the original material ID
          let actualMaterialId = material._id;
          if (material._id.startsWith('week-material-')) {
            actualMaterialId = material._id.replace('week-material-', '');
          }
          
          const isCompleted = this.studentProgress.completedMaterials.includes(material._id) ||
                             this.studentProgress.completedMaterials.includes(actualMaterialId) ||
                             (material.originalMaterialId && this.studentProgress.completedMaterials.includes(material.originalMaterialId));
          console.log(`Material ${material.title}: ${isCompleted ? 'completed' : 'not completed'} (checked IDs: ${material._id}, ${actualMaterialId}, ${material.originalMaterialId})`);
          return isCompleted;
        }
        console.log(`Material ${material.title}: no progress data`);
        return false;
      }
    }).length;
    
    console.log('Completed materials:', completedMaterials);
    
    const progressPercentage = totalMaterials > 0 ? Math.round((completedMaterials / totalMaterials) * 100) : 0;
    
    // Update progress circle
    const progressRing = document.querySelector('.progress-ring-fill');
    const circumference = 2 * Math.PI * 60; // radius = 60 (updated for new design)
    const offset = circumference - (progressPercentage / 100) * circumference;
    
    if (progressRing) {
      progressRing.style.strokeDashoffset = offset;
    }
    
    // Update progress text
    document.getElementById('progressPercentage').textContent = progressPercentage + '%';
    document.getElementById('completedMaterials').textContent = completedMaterials;
    
    // Update progress badge and message
    this.updateProgressBadge(progressPercentage, completedMaterials, totalMaterials);
    
    // Update homework status
    const homeworkStats = this.getHomeworkStats();
    document.getElementById('submittedCount').textContent = homeworkStats.submitted;
    document.getElementById('pendingCount').textContent = homeworkStats.pending;
    document.getElementById('overdueCount').textContent = homeworkStats.overdue;
  }

  updateProgressBadge(progressPercentage, completedMaterials, totalMaterials) {
    const progressBadge = document.getElementById('progressBadge');
    const progressMessage = document.getElementById('progressMessage');
    
    if (!progressBadge || !progressMessage) return;
    
    let badgeText = '';
    let messageText = '';
    let badgeClass = '';
    
    if (progressPercentage === 0) {
      badgeText = 'Not Started';
      messageText = 'Start by viewing the materials below';
      badgeClass = 'not-started';
    } else if (progressPercentage < 50) {
      badgeText = 'In Progress';
      messageText = `Great start! ${completedMaterials} of ${totalMaterials} materials completed`;
      badgeClass = 'in-progress';
    } else if (progressPercentage < 100) {
      badgeText = 'Almost Done';
      messageText = `You're doing great! ${completedMaterials} of ${totalMaterials} materials completed`;
      badgeClass = 'almost-done';
    } else {
      badgeText = 'Completed';
      messageText = 'Congratulations! You have completed all materials for this week';
      badgeClass = 'completed';
    }
    
    // Update badge
    progressBadge.className = `progress-badge ${badgeClass}`;
    progressBadge.querySelector('.badge-text').textContent = badgeText;
    
    // Update message
    progressMessage.innerHTML = `
      <i class="fas fa-${this.getProgressIcon(progressPercentage)}"></i>
      <span>${messageText}</span>
    `;
  }
  
  getProgressIcon(progressPercentage) {
    if (progressPercentage === 0) return 'play-circle';
    if (progressPercentage < 50) return 'clock';
    if (progressPercentage < 100) return 'trophy';
    return 'check-circle';
  }

  getHomeworkStats() {
    const homeworkMaterials = this.materials.filter(m => m.type === 'homework');
    const stats = { submitted: 0, pending: 0, overdue: 0 };
    
    homeworkMaterials.forEach(material => {
      const submission = this.homeworkSubmissions.find(sub => 
        sub.materialId === material._id || 
        (material.originalMaterialId && sub.materialId === material.originalMaterialId)
      );
      
      if (submission && (submission.status === 'submitted' || submission.status === 'graded')) {
        stats.submitted++;
      } else if (material.dueDateTime && new Date(material.dueDateTime) < new Date()) {
        stats.overdue++;
      } else {
        stats.pending++;
      }
    });
    
    return stats;
  }

  updateDeadlines() {
    const deadlines = this.materials
      .filter(material => material.dueDate && material.type === 'homework')
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);
    
    const deadlinesList = document.getElementById('deadlinesList');
    
    if (deadlines.length === 0) {
      deadlinesList.innerHTML = '<p class="text-muted">No upcoming deadlines</p>';
      return;
    }
    
    deadlinesList.innerHTML = deadlines.map(deadline => `
      <div class="deadline-item">
        <div class="deadline-title">${deadline.title}</div>
        <div class="deadline-date">Due: ${new Date(deadline.dueDate).toLocaleDateString()}</div>
      </div>
    `).join('');
  }

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      this.showFilePreview(file);
    }
  }

  handleDragOver(e) {
    e.preventDefault();
    this.fileUploadArea.style.borderColor = '#667eea';
    this.fileUploadArea.style.background = '#f8f9ff';
  }

  handleDrop(e) {
    e.preventDefault();
    this.fileUploadArea.style.borderColor = '#e0e0e0';
    this.fileUploadArea.style.background = '';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      this.fileInput.files = files;
      this.showFilePreview(files[0]);
    }
  }

  showFilePreview(file) {
    const fileName = file.name;
    const fileSize = this.formatFileSize(file.size);
    
    document.querySelector('.file-name').textContent = fileName;
    document.querySelector('.file-size').textContent = fileSize;
    
    this.fileUploadArea.style.display = 'none';
    this.filePreview.style.display = 'flex';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  showLoading() {
    this.materialsList.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading materials...</p>
      </div>
    `;
  }

  showError(message) {
    this.materialsList.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Error</h3>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="location.reload()">
          <i class="fas fa-refresh"></i>
          Retry
        </button>
      </div>
    `;
  }

  showEmptyState() {
    this.materialsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <i class="fas fa-folder-open"></i>
        </div>
        <h3>No Materials Available</h3>
        <p>Materials for this week will be added soon. Check back later or contact your teacher if you have any questions.</p>
        <div class="empty-actions">
          <button class="btn btn-secondary" onclick="window.location.href='/student/dashboard'">
            <i class="fas fa-arrow-left"></i>
            Back to Dashboard
          </button>
        </div>
      </div>
    `;
  }
}

// Global functions for modal handling
function openHomeworkModal(materialId) {
  console.log('Opening homework modal for material:', materialId);
  console.log('Available materials:', window.studentWeekContent.materials);
  
  const material = window.studentWeekContent.materials.find(m => 
    m._id === materialId || m.originalMaterialId === materialId
  );
  
  console.log('Found material:', material);
  
  if (!material) {
    showNotification('Material not found', 'error');
    return;
  }
  
  // Reset form completely first
  const form = document.getElementById('homeworkForm');
  form.reset();
  
  // Hide progress bar
  document.getElementById('uploadProgress').style.display = 'none';
  
  // Populate modal with material data
  document.getElementById('homeworkWeekId').value = window.studentWeekContent.weekData.id;
  document.getElementById('homeworkMaterialId').value = materialId;
  document.getElementById('homeworkTitle').value = material.title || 'Untitled Homework';
  document.getElementById('homeworkDescription').value = '';
  // Update due date display with proper formatting
  let dueDateDisplay = 'No due date';
  if (material.dueDateTime) {
    const dueDateTime = new Date(material.dueDateTime);
    dueDateDisplay = dueDateTime.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } else if (material.dueDate) {
    dueDateDisplay = new Date(material.dueDate).toLocaleDateString();
  }
  
  document.getElementById('homeworkDueDate').value = dueDateDisplay;
  
  // Reset file upload UI
  document.getElementById('fileUploadArea').style.display = 'block';
  document.getElementById('filePreview').style.display = 'none';
  
  // Enable submit button
  document.getElementById('submitBtn').disabled = false;
  document.getElementById('cancelBtn').disabled = false;
  
  console.log('Homework modal data:', {
    title: material.title,
    dueDate: material.dueDate,
    materialId: materialId
  });
  
  // Add file selection event listener
  const fileInput = document.getElementById('homeworkFile');
  const fileUploadArea = document.getElementById('fileUploadArea');
  
  fileInput.addEventListener('change', handleFileSelection);
  
  // Add drag and drop functionality
  fileUploadArea.addEventListener('dragover', handleDragOver);
  fileUploadArea.addEventListener('dragleave', handleDragLeave);
  fileUploadArea.addEventListener('drop', handleDrop);
  fileUploadArea.addEventListener('click', () => fileInput.click());
  
  // Show modal
  document.getElementById('homeworkModal').classList.add('show');
}

function handleFileSelection(event) {
  const file = event.target.files[0];
  const fileUploadArea = document.getElementById('fileUploadArea');
  const filePreview = document.getElementById('filePreview');
  
  if (file) {
    // Show file preview
    fileUploadArea.style.display = 'none';
    filePreview.style.display = 'block';
    
    // Update preview content
    const fileName = filePreview.querySelector('.file-name');
    const fileSize = filePreview.querySelector('.file-size');
    
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
  } else {
    // Show upload area
    fileUploadArea.style.display = 'block';
    filePreview.style.display = 'none';
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function handleDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add('dragover');
}

function handleDragLeave(event) {
  event.preventDefault();
  event.currentTarget.classList.remove('dragover');
}

function handleDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove('dragover');
  
  const files = event.dataTransfer.files;
  if (files.length > 0) {
    const fileInput = document.getElementById('homeworkFile');
    fileInput.files = files;
    handleFileSelection({ target: fileInput });
  }
}

function closeHomeworkModal() {
  document.getElementById('homeworkModal').classList.remove('show');
  
  // Clean up event listeners
  const fileInput = document.getElementById('homeworkFile');
  const fileUploadArea = document.getElementById('fileUploadArea');
  
  fileInput.removeEventListener('change', handleFileSelection);
  fileUploadArea.removeEventListener('dragover', handleDragOver);
  fileUploadArea.removeEventListener('dragleave', handleDragLeave);
  fileUploadArea.removeEventListener('drop', handleDrop);
  fileUploadArea.removeEventListener('click', () => fileInput.click());
  
  // Reset form and UI
  document.getElementById('homeworkForm').reset();
  document.getElementById('fileUploadArea').style.display = 'block';
  document.getElementById('filePreview').style.display = 'none';
  document.getElementById('uploadProgress').style.display = 'none';
  
  // Re-enable buttons
  document.getElementById('submitBtn').disabled = false;
  document.getElementById('cancelBtn').disabled = false;
}

function removeFile() {
  document.getElementById('homeworkFile').value = '';
  document.getElementById('fileUploadArea').style.display = 'block';
  document.getElementById('filePreview').style.display = 'none';
  
  // Remove the event listener to prevent memory leaks
  const fileInput = document.getElementById('homeworkFile');
  fileInput.removeEventListener('change', handleFileSelection);
}

async function submitHomework() {
  const form = document.getElementById('homeworkForm');
  const formData = new FormData(form);
  
  // Validate form
  const file = document.getElementById('homeworkFile').files[0];
  if (!file) {
    showNotification('Please select a file to upload', 'error');
    return;
  }
  
  // Check file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    showNotification('File size must be less than 10MB', 'error');
    return;
  }
  
  // Show progress bar and disable buttons
  const progressContainer = document.getElementById('uploadProgress');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const submitBtn = document.getElementById('submitBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  
  progressContainer.style.display = 'block';
  submitBtn.disabled = true;
  cancelBtn.disabled = true;
  
  // Simulate progress updates
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress > 90) progress = 90;
    
    progressFill.style.width = progress + '%';
    progressText.textContent = Math.round(progress) + '%';
  }, 200);
  
  try {
    showNotification('Uploading homework...', 'info');
    
    const response = await fetch('/student/api/homework/submit', {
      method: 'POST',
      body: formData
    });
    
    // Complete progress bar
    clearInterval(progressInterval);
    progressFill.style.width = '100%';
    progressText.textContent = '100%';
    
    const result = await response.json();
    
    if (result.success) {
      showNotification('Homework submitted successfully!', 'success');
      
      // Wait a moment to show completion
      setTimeout(() => {
        closeHomeworkModal();
        // Force reload content and clear any cached data
        window.studentWeekContent.materials = [];
        window.studentWeekContent.homeworkSubmissions = [];
        window.studentWeekContent.studentProgress = null;
        window.studentWeekContent.loadWeekContent(); // Reload content
      }, 1000);
    } else {
      showNotification(result.message || 'Failed to submit homework', 'error');
      // Re-enable buttons on error
      submitBtn.disabled = false;
      cancelBtn.disabled = false;
      progressContainer.style.display = 'none';
    }
  } catch (error) {
    console.error('Error submitting homework:', error);
    showNotification('Error submitting homework', 'error');
    
    // Re-enable buttons on error
    clearInterval(progressInterval);
    submitBtn.disabled = false;
    cancelBtn.disabled = false;
    progressContainer.style.display = 'none';
  }
}

function viewContent(materialId, type) {
  const material = window.studentWeekContent.materials.find(m => 
    m._id === materialId || m.originalMaterialId === materialId
  );
  
  if (!material) {
    showNotification('Material not found', 'error');
    return;
  }
  
  // Populate modal
  document.getElementById('contentModalTitle').textContent = material.title;
  
  let content = '';
  if (material.fileUrl) {
    // Check if it's a PDF file (either type is 'pdf', 'el-5olasa', or fileType is 'application/pdf')
    const isPDF = type === 'pdf' || type === 'el-5olasa' || material.fileType === 'application/pdf' || 
                  (material.fileName && material.fileName.toLowerCase().endsWith('.pdf'));
    
    if (isPDF) {
      // Secure PDF viewer using PDF.js
      content = `
        <div class="secure-pdf-viewer" id="pdfViewer-${material._id}">
          <div class="pdf-controls">
            <button class="btn btn-secondary" onclick="zoomOut('${material._id}')">
              <i class="fas fa-search-minus"></i>
              Zoom Out
            </button>
            <span class="zoom-level" id="zoomLevel-${material._id}">100%</span>
            <button class="btn btn-secondary" onclick="zoomIn('${material._id}')">
              <i class="fas fa-search-plus"></i>
              Zoom In
            </button>
            <button class="btn btn-primary" onclick="prevPage('${material._id}')">
              <i class="fas fa-chevron-left"></i>
              Previous
            </button>
            <span class="page-info" id="pageInfo-${material._id}">Page 1 of 1</span>
            <button class="btn btn-primary" onclick="nextPage('${material._id}')">
              <i class="fas fa-chevron-right"></i>
              Next
            </button>
            <button class="btn btn-success" onclick="downloadPDF('${material._id}', '${material.fileName || 'document.pdf'}')" title="Download PDF">
              <i class="fas fa-download"></i>
              Download
            </button>
          </div>
          <div class="pdf-container">
            <canvas id="pdfCanvas-${material._id}" class="pdf-canvas"></canvas>
          </div>
          <div class="pdf-loading" id="pdfLoading-${material._id}">
            <div class="loading-spinner"></div>
            <p>Loading PDF...</p>
          </div>
          <div class="pdf-error" id="pdfError-${material._id}" style="display: none;">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Unable to load PDF. The file may be corrupted or protected.</p>
          </div>
        </div>
      `;
    } else {
      content = `
        <div class="file-download">
          <div class="file-info">
            <i class="fas fa-file-download"></i>
            <h4>${material.fileName || 'Download File'}</h4>
            <p>Click the download button to save this file to your device.</p>
            <div class="file-actions">
              <button class="btn btn-primary" onclick="downloadFile('${material.fileUrl}', '${material.fileName}')">
                <i class="fas fa-download"></i>
                Download File
              </button>
              <button class="btn btn-secondary" onclick="window.open('${material.fileUrl}', '_blank')">
                <i class="fas fa-external-link-alt"></i>
                Open in New Tab
              </button>
            </div>
          </div>
        </div>
      `;
    }
  } else if (material.content) {
    // For el-5olasa, show both text content and file if available
    if (type === 'el-5olasa' && material.fileUrl) {
      const isPDF = material.fileType === 'application/pdf' || 
                    (material.fileName && material.fileName.toLowerCase().endsWith('.pdf'));
      
      if (isPDF) {
        content = `
          <div class="el-5olasa-content">
            <div class="content-text">
              <h4>Summary Content:</h4>
              <div class="content-text">${material.content}</div>
            </div>
            <div class="content-separator"></div>
            <div class="content-file">
              <h4>Summary File:</h4>
              <div class="secure-pdf-viewer" id="pdfViewer-${material._id}">
                <div class="pdf-controls">
                  <button class="btn btn-secondary" onclick="zoomOut('${material._id}')">
                    <i class="fas fa-search-minus"></i>
                    Zoom Out
                  </button>
                  <span class="zoom-level" id="zoomLevel-${material._id}">100%</span>
                  <button class="btn btn-secondary" onclick="zoomIn('${material._id}')">
                    <i class="fas fa-search-plus"></i>
                    Zoom In
                  </button>
                  <button class="btn btn-primary" onclick="prevPage('${material._id}')">
                    <i class="fas fa-chevron-left"></i>
                    Previous
                  </button>
                  <span class="page-info" id="pageInfo-${material._id}">Page 1 of 1</span>
                  <button class="btn btn-primary" onclick="nextPage('${material._id}')">
                    <i class="fas fa-chevron-right"></i>
                    Next
                  </button>
                  <button class="btn btn-success" onclick="downloadPDF('${material._id}', '${material.fileName || 'document.pdf'}')" title="Download PDF">
                    <i class="fas fa-download"></i>
                    Download
                  </button>
                </div>
                <div class="pdf-container">
                  <canvas id="pdfCanvas-${material._id}" class="pdf-canvas"></canvas>
                </div>
                <div class="pdf-loading" id="pdfLoading-${material._id}">
                  <div class="loading-spinner"></div>
                  <p>Loading PDF...</p>
                </div>
                <div class="pdf-error" id="pdfError-${material._id}" style="display: none;">
                  <i class="fas fa-exclamation-triangle"></i>
                  <p>Unable to load PDF. The file may be corrupted or protected.</p>
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        content = `
          <div class="el-5olasa-content">
            <div class="content-text">
              <h4>Summary Content:</h4>
              <div class="content-text">${material.content}</div>
            </div>
            <div class="content-separator"></div>
            <div class="content-file">
              <h4>Summary File:</h4>
              <div class="file-download">
                <div class="file-info">
                  <i class="fas fa-file-download"></i>
                  <h4>${material.fileName || 'Download File'}</h4>
                  <p>Click the download button to save this file to your device.</p>
                  <div class="file-actions">
                    <button class="btn btn-primary" onclick="downloadFile('${material.fileUrl}', '${material.fileName}')">
                      <i class="fas fa-download"></i>
                      Download File
                    </button>
                    <button class="btn btn-secondary" onclick="window.open('${material.fileUrl}', '_blank')">
                      <i class="fas fa-external-link-alt"></i>
                      Open in New Tab
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }
    } else {
      content = `
        <div class="text-content">
          <div class="content-text">${material.content}</div>
        </div>
      `;
    }
  } else {
    content = `
      <div class="no-content">
        <i class="fas fa-info-circle"></i>
        <p>No content available for this material.</p>
      </div>
    `;
  }
  
  document.getElementById('contentModalBody').innerHTML = content;
  
  // Show download button for PDFs if allowed
  const downloadBtn = document.getElementById('contentModalAction');
  if (material.fileUrl && material.allowDownload !== false) {
    const isPDF = type === 'pdf' || type === 'el-5olasa' || 
                  material.fileType === 'application/pdf' || 
                  (material.fileName && material.fileName.toLowerCase().endsWith('.pdf'));
    
    if (isPDF) {
      downloadBtn.style.display = 'inline-block';
      downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download PDF';
      downloadBtn.onclick = () => downloadPDF(material._id, material.fileName);
    } else {
      downloadBtn.style.display = 'none';
    }
  } else {
    downloadBtn.style.display = 'none';
  }
  
  // Show modal
  document.getElementById('contentModal').classList.add('show');
  
  // Load PDF if it's a PDF type or el-5olasa with PDF file
  if ((type === 'pdf' || type === 'el-5olasa') && material.fileUrl) {
    // Check if the file is actually a PDF
    const isPDF = material.fileType === 'application/pdf' || 
                  (material.fileName && material.fileName.toLowerCase().endsWith('.pdf'));
    
    if (isPDF) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        loadSecurePDF(material._id, material.fileUrl);
      }, 100);
    }
  }
  
  // Mark non-homework content as completed when viewed
  if (type !== 'homework') {
    markContentAsCompleted(material._id, type);
  }
}

function closeContentModal() {
  document.getElementById('contentModal').classList.remove('show');
}

// Download PDF function
function downloadPDF(materialId, fileName) {
  try {
    const downloadUrl = `/student/api/download-pdf/${materialId}`;
    
    // Create a temporary link element for download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName || 'document.pdf';
    link.style.display = 'none';
    
    // Add to DOM, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Download started...', 'success');
  } catch (error) {
    console.error('Download error:', error);
    showNotification('Error downloading PDF', 'error');
  }
}

function viewSubmission(materialId) {
  // TODO: Implement view submission functionality
  showNotification('View submission feature coming soon', 'info');
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    <span>${message}</span>
  `;
  
  // Add notification styles
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3'};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1001;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
    animation: slideInRight 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-in';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
}

// Secure PDF Viewer using PDF.js
class SecurePDFViewer {
  constructor() {
    this.pdfs = new Map(); // Store PDF documents
    this.currentPages = new Map(); // Store current page numbers
    this.zoomLevels = new Map(); // Store zoom levels
  }

  async loadPDF(materialId, url) {
    try {
      const loadingEl = document.getElementById(`pdfLoading-${materialId}`);
      const errorEl = document.getElementById(`pdfError-${materialId}`);
      const canvas = document.getElementById(`pdfCanvas-${materialId}`);
      
      if (loadingEl) loadingEl.style.display = 'block';
      if (errorEl) errorEl.style.display = 'none';

      // Use secure PDF route instead of direct URL
      const secureUrl = `/student/api/secure-pdf/${materialId}`;
      const response = await fetch(secureUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/pdf',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      this.pdfs.set(materialId, pdf);
      this.currentPages.set(materialId, 1);
      this.zoomLevels.set(materialId, 1.0);

      await this.renderPage(materialId, 1);
      
      if (loadingEl) loadingEl.style.display = 'none';
      this.updatePageInfo(materialId);

    } catch (error) {
      console.error('Error loading PDF:', error);
      const loadingEl = document.getElementById(`pdfLoading-${materialId}`);
      const errorEl = document.getElementById(`pdfError-${materialId}`);
      
      if (loadingEl) loadingEl.style.display = 'none';
      if (errorEl) errorEl.style.display = 'block';
    }
  }

  async renderPage(materialId, pageNum) {
    const pdf = this.pdfs.get(materialId);
    const canvas = document.getElementById(`pdfCanvas-${materialId}`);
    const zoom = this.zoomLevels.get(materialId) || 1.0;

    if (!pdf || !canvas) return;

    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: zoom });
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const context = canvas.getContext('2d');
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;
      this.currentPages.set(materialId, pageNum);
      this.updatePageInfo(materialId);
      this.updateZoomLevel(materialId);

    } catch (error) {
      console.error('Error rendering PDF page:', error);
    }
  }

  updatePageInfo(materialId) {
    const pdf = this.pdfs.get(materialId);
    const currentPage = this.currentPages.get(materialId) || 1;
    const pageInfoEl = document.getElementById(`pageInfo-${materialId}`);
    
    if (pageInfoEl && pdf) {
      pageInfoEl.textContent = `Page ${currentPage} of ${pdf.numPages}`;
    }
  }

  updateZoomLevel(materialId) {
    const zoom = this.zoomLevels.get(materialId) || 1.0;
    const zoomLevelEl = document.getElementById(`zoomLevel-${materialId}`);
    
    if (zoomLevelEl) {
      zoomLevelEl.textContent = `${Math.round(zoom * 100)}%`;
    }
  }

  async nextPage(materialId) {
    const pdf = this.pdfs.get(materialId);
    const currentPage = this.currentPages.get(materialId) || 1;
    
    if (pdf && currentPage < pdf.numPages) {
      await this.renderPage(materialId, currentPage + 1);
    }
  }

  async prevPage(materialId) {
    const currentPage = this.currentPages.get(materialId) || 1;
    
    if (currentPage > 1) {
      await this.renderPage(materialId, currentPage - 1);
    }
  }

  async zoomIn(materialId) {
    const currentZoom = this.zoomLevels.get(materialId) || 1.0;
    const newZoom = Math.min(currentZoom + 0.25, 3.0);
    this.zoomLevels.set(materialId, newZoom);
    
    const currentPage = this.currentPages.get(materialId) || 1;
    await this.renderPage(materialId, currentPage);
  }

  async zoomOut(materialId) {
    const currentZoom = this.zoomLevels.get(materialId) || 1.0;
    const newZoom = Math.max(currentZoom - 0.25, 0.5);
    this.zoomLevels.set(materialId, newZoom);
    
    const currentPage = this.currentPages.get(materialId) || 1;
    await this.renderPage(materialId, currentPage);
  }
}

// Global PDF viewer instance
const securePDFViewer = new SecurePDFViewer();

// PDF Helper Functions (now secure)
function loadSecurePDF(materialId, url) {
  securePDFViewer.loadPDF(materialId, url);
}

function nextPage(materialId) {
  securePDFViewer.nextPage(materialId);
}

function prevPage(materialId) {
  securePDFViewer.prevPage(materialId);
}

function zoomIn(materialId) {
  securePDFViewer.zoomIn(materialId);
}

function zoomOut(materialId) {
  securePDFViewer.zoomOut(materialId);
}

// Download file function
function downloadFile(fileUrl, fileName) {
  try {
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'download';
    link.target = '_blank';
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Download started!', 'success');
  } catch (error) {
    console.error('Download error:', error);
    showNotification('Download failed. Please try again.', 'error');
  }
}

// Mark content as completed and update progress
async function markContentAsCompleted(materialId, type) {
  try {
    const response = await fetch('/student/api/mark-content-completed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        materialId: materialId,
        type: type,
        weekId: window.weekData.id
      })
    });

    const result = await response.json();
    
    if (result.success) {
      // Update the student progress data
      if (window.studentWeekContent.studentProgress) {
        if (!window.studentWeekContent.studentProgress.completedMaterials) {
          window.studentWeekContent.studentProgress.completedMaterials = [];
        }
        if (!window.studentWeekContent.studentProgress.completedMaterials.includes(materialId)) {
          window.studentWeekContent.studentProgress.completedMaterials.push(materialId);
        }
        // Update progress data from server response
        if (result.progress) {
          window.studentWeekContent.studentProgress.score = result.progress.score;
          window.studentWeekContent.studentProgress.status = result.progress.status;
        }
      } else {
        window.studentWeekContent.studentProgress = {
          completedMaterials: [materialId],
          score: result.progress ? result.progress.score : 0,
          status: result.progress ? result.progress.status : 'in_progress'
        };
      }
      
      // Update the material status in the UI
      updateMaterialStatus(materialId, 'completed');
      // Update progress
      window.studentWeekContent.updateProgress();
      console.log('Content marked as completed:', materialId);
      
      // Show success notification
      if (result.weekCompleted) {
        showNotification('Congratulations! You have completed this week!', 'success');
      } else {
        showNotification('Content marked as completed!', 'success');
      }
      
      // Reload week content to get fresh data
      setTimeout(() => {
        window.studentWeekContent.loadWeekContent();
      }, 1000);
      
      // Week completion is handled by the success notification only
    }
  } catch (error) {
    console.error('Error marking content as completed:', error);
    showNotification('Error marking content as completed', 'error');
  }
}

// Update material status in the UI
function updateMaterialStatus(materialId, status) {
  const materialCard = document.querySelector(`[data-material-id="${materialId}"]`);
  if (materialCard) {
    const statusElement = materialCard.querySelector('.material-status');
    if (statusElement) {
      statusElement.className = `material-status ${status}`;
      statusElement.textContent = status === 'completed' ? 'Completed' : status;
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.studentWeekContent = new StudentWeekContent();
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);
