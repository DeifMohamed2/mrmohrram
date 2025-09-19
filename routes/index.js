const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth');

// Landing page route
router.get('/', (req, res) => {
  res.render('index', {
    title: 'Mr Mohrr7am - IG Math Learning Platform',
    theme: req.cookies.theme || 'dark',
  });
});

// Dashboard route (protected) - Redirect to student dashboard
router.get('/dashboard', isAuthenticated, (req, res) => {
  res.redirect('/student/dashboard');
});

// Theme toggle endpoint
router.post('/toggle-theme', (req, res) => {
  const currentTheme = req.cookies.theme || 'dark';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';

  res.cookie('theme', newTheme, { maxAge: 365 * 24 * 60 * 60 * 1000 }); // 1 year
  res.json({ theme: newTheme });
});

module.exports = router;

