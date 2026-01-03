/**
 * Frontend JavaScript for common functionality
 */

// Logout function
function logout() {
  if (!confirm('Are you sure you want to logout?')) {
    return false;
  }

  fetch('/api/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('token')
    },
    credentials: 'include'
  })
  .then(response => response.json())
  .then(data => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  })
  .catch(error => {
    console.error('Logout error:', error);
    // Force logout even on error
    localStorage.removeItem('token');
    window.location.href = '/login';
  });

  return false;
}

// Format date for display
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

// Show loading state
function showLoading(button) {
  if (!button) return;
  button.disabled = true;
  button.dataset.originalText = button.textContent;
  button.textContent = 'Loading...';
}

// Hide loading state
function hideLoading(button) {
  if (!button) return;
  button.disabled = false;
  if (button.dataset.originalText) {
    button.textContent = button.dataset.originalText;
  }
}

// Generic fetch with auth
async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('token');
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    credentials: 'include'
  };

  if (token) {
    config.headers['Authorization'] = 'Bearer ' + token;
  }

  return fetch(url, config);
}

// Set minimum date for date inputs to today
document.addEventListener('DOMContentLoaded', () => {
  const dateInputs = document.querySelectorAll('input[type="date"]');
  const today = new Date().toISOString().split('T')[0];
  
  dateInputs.forEach(input => {
    if (!input.hasAttribute('min')) {
      input.setAttribute('min', today);
    }
  });

  // Add smooth scroll behavior
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
});

// Prevent accidental form resubmission
if (window.history.replaceState) {
  window.history.replaceState(null, null, window.location.href);
}




/**
 * Mobile Navigation Menu Toggle
 */
document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.querySelector('.navbar .container');
  const navLinks = document.querySelector('.nav-links');
  
  if (!navbar || !navLinks) return;

  // Create hamburger menu
  let hamburger = document.querySelector('.hamburger');
  if (!hamburger) {
    hamburger = document.createElement('button');
    hamburger.className = 'hamburger';
    hamburger.setAttribute('aria-label', 'Toggle menu');
    hamburger.innerHTML = `
      <span></span>
      <span></span>
      <span></span>
    `;
    navbar.appendChild(hamburger);
  }

  // Create overlay
  let overlay = document.querySelector('.nav-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'nav-overlay';
    document.body.appendChild(overlay);
  }

  // Toggle menu function
  const toggleMenu = (open) => {
    if (open) {
      hamburger.classList.add('active');
      navLinks.classList.add('active');
      overlay.classList.add('active');
      document.body.classList.add('menu-open');
    } else {
      hamburger.classList.remove('active');
      navLinks.classList.remove('active');
      overlay.classList.remove('active');
      document.body.classList.remove('menu-open');
    }
  };

  // Hamburger click
  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = navLinks.classList.contains('active');
    toggleMenu(!isOpen);
  });

  // Overlay click - close menu
  overlay.addEventListener('click', () => {
    toggleMenu(false);
  });

  // Close menu when clicking links
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      toggleMenu(false);
    });
  });

  // Close menu on window resize to desktop
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth > 768) {
        toggleMenu(false);
      }
    }, 250);
  });

  // Prevent menu from staying open on orientation change
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      if (window.innerWidth > 768) {
        toggleMenu(false);
      }
    }, 200);
  });
});
