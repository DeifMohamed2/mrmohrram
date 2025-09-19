const express = require('express');
const router = express.Router();
const { isNotAuthenticated } = require('../middlewares/auth');
const { 
  getLoginPage, 
  getRegisterPage, 
  registerUser, 
  loginUser, 
  logoutUser 
} = require('../controllers/authController');

// Login page
router.get('/login', isNotAuthenticated, getLoginPage);

// Register page
router.get('/register', isNotAuthenticated, getRegisterPage);

// Register handle
router.post('/register', isNotAuthenticated, registerUser);

// Login handle
router.post('/login', isNotAuthenticated, loginUser);

// Logout handle
router.get('/logout', logoutUser);

module.exports = router;
