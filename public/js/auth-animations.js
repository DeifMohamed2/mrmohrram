/**
 * Authentication Pages Animations for Mr Mohrr7am
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize auth particles
  initAuthParticles();
  
  // Initialize floating elements
  initFloatingElements();
  
  // Add animation to links
  initAnimatedLinks();
  
  // Add form animations
  initFormAnimations();
});

/**
 * Initialize particles for auth pages
 */
function initAuthParticles() {
  const loginParticles = document.getElementById('auth-particles');
  const registerParticles = document.getElementById('auth-particles-register');
  
  if (loginParticles) {
    createParticles(loginParticles);
  }
  
  if (registerParticles) {
    createParticles(registerParticles);
  }
}

/**
 * Create particles in the given container
 * @param {HTMLElement} container - The container element
 */
function createParticles(container) {
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  container.appendChild(canvas);
  
  const ctx = canvas.getContext('2d');
  
  // Resize handler
  window.addEventListener('resize', () => {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  });
  
  // Particle class
  class Particle {
    constructor() {
      this.reset();
    }
    
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 3 + 1;
      this.speedX = (Math.random() - 0.5) * 0.5;
      this.speedY = (Math.random() - 0.5) * 0.5;
      this.color = `rgba(255, 255, 255, ${Math.random() * 0.3 + 0.1})`;
    }
    
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      
      if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
        this.reset();
      }
    }
    
    draw() {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Create particles
  const particles = [];
  const particleCount = Math.min(50, Math.floor((canvas.width * canvas.height) / 15000));
  
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }
  
  // Animation loop
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach(particle => {
      particle.update();
      particle.draw();
    });
    
    requestAnimationFrame(animate);
  }
  
  animate();
}

/**
 * Initialize floating elements
 */
function initFloatingElements() {
  const floatingElements = document.querySelectorAll('.floating-element');
  
  floatingElements.forEach((element, index) => {
    // Get animation parameters from data attributes or use defaults
    const amplitude = element.dataset.floatAmplitude || 15;
    const period = element.dataset.floatPeriod || 3;
    const phase = index * 0.5; // Stagger phases for varied motion
    
    // Apply floating animation
    animateFloating(element, parseFloat(amplitude), parseFloat(period), phase);
  });
}

/**
 * Animate a floating element with custom parameters
 * @param {Element} element - The element to animate
 * @param {number} amplitude - The maximum distance to move
 * @param {number} period - The time period of one complete cycle
 * @param {number} phase - The starting phase of the animation
 */
function animateFloating(element, amplitude, period, phase) {
  let startTime = Date.now() / 1000;
  startTime -= phase; // Apply phase shift
  
  function updatePosition() {
    const elapsed = Date.now() / 1000 - startTime;
    const yPos = amplitude * Math.sin(2 * Math.PI * elapsed / period);
    const rotation = amplitude * 0.05 * Math.sin(2 * Math.PI * elapsed / (period * 1.5));
    
    element.style.transform = `translateY(${yPos}px) rotate(${rotation}deg)`;
    
    requestAnimationFrame(updatePosition);
  }
  
  updatePosition();
}

/**
 * Initialize animated links
 */
function initAnimatedLinks() {
  const links = document.querySelectorAll('.animated-link');
  
  links.forEach(link => {
    link.addEventListener('mouseenter', () => {
      link.classList.add('pulse');
    });
    
    link.addEventListener('animationend', () => {
      link.classList.remove('pulse');
    });
  });
}

/**
 * Initialize form animations
 */
function initFormAnimations() {
  const inputs = document.querySelectorAll('.form-control');
  
  inputs.forEach(input => {
    input.addEventListener('focus', () => {
      input.parentElement.classList.add('input-focused');
    });
    
    input.addEventListener('blur', () => {
      input.parentElement.classList.remove('input-focused');
    });
  });
}


