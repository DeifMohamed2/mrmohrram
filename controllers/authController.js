const User = require('../models/User');

// Get login page
const getLoginPage = (req, res) => {
  res.render('auth/login', {
    title: 'Login',
    theme: req.cookies.theme || 'dark',
  });
};

// Get register page
const getRegisterPage = (req, res) => {
  res.render('auth/register', {
    title: 'Register',
    theme: req.cookies.theme || 'dark',
  });
};

// Register user
const registerUser = async (req, res) => {
  const {
    name,
    email,
    password,
    password2,
    age,
    year,
    schoolName,
    studentPhoneNumber,
    parentPhoneNumber,
    curriculum,
    studentType,
  } = req.body;

  let errors = [];

  // Check required fields
  if (
    !name ||
    !email ||
    !password ||
    !password2 ||
    !age ||
    !year ||
    !schoolName ||
    !studentPhoneNumber ||
    !parentPhoneNumber ||
    !curriculum ||
    !studentType
  ) {
    errors.push({ msg: 'Please fill in all required fields' });
  }

  // Validate name
  if (name && (name.length < 2 || name.length > 50)) {
    errors.push({ msg: 'Name must be between 2 and 50 characters' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    errors.push({ msg: 'Please enter a valid email address' });
  }

  // Check passwords match
  if (password !== password2) {
    errors.push({ msg: 'Passwords do not match' });
  }

  // Check password strength
  if (password && password.length < 6) {
    errors.push({ msg: 'Password must be at least 6 characters long' });
  }

  // Validate age
  const ageNum = parseInt(age);
  if (age && (isNaN(ageNum) || ageNum < 10 || ageNum > 100)) {
    errors.push({ msg: 'Age must be between 10 and 100' });
  }

  // Validate year
  const validYears = [
    'Year 7',
    'Year 8',
    'Year 9',
    'Year 10',
    'Year 11',
    'Year 12',
    'Year 13',
  ];
  if (year && !validYears.includes(year)) {
    errors.push({ msg: 'Please select a valid academic year' });
  }

  // Validate school name
  if (schoolName && (schoolName.length < 2 || schoolName.length > 100)) {
    errors.push({ msg: 'School name must be between 2 and 100 characters' });
  }

  // Validate student phone number
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
  if (studentPhoneNumber && !phoneRegex.test(studentPhoneNumber)) {
    errors.push({
      msg: 'Please enter a valid student phone number (10-15 digits)',
    });
  }

  // Validate parent phone number
  if (parentPhoneNumber && !phoneRegex.test(parentPhoneNumber)) {
    errors.push({
      msg: 'Please enter a valid parent phone number (10-15 digits)',
    });
  }

  // Validate that student and parent phone numbers are different
  if (
    studentPhoneNumber &&
    parentPhoneNumber &&
    studentPhoneNumber.trim() === parentPhoneNumber.trim()
  ) {
    errors.push({
      msg: 'Student phone number must be different from parent phone number',
    });
  }

  // Validate curriculum
  if (curriculum && !['Cambridge', 'Edexcel'].includes(curriculum)) {
    errors.push({
      msg: 'Please select either Cambridge or Edexcel curriculum',
    });
  }

  // Validate student type
  if (studentType && !['School', 'Center', 'Online'].includes(studentType)) {
    errors.push({
      msg: 'Please select a valid student type (School, Center, or Online)',
    });
  }

  if (errors.length > 0) {
    return res.render('auth/register', {
      title: 'Register',
      theme: req.cookies.theme || 'dark',
      errors,
      name,
      email,
      age,
      year,
      schoolName,
      studentPhoneNumber,
      parentPhoneNumber,
      curriculum,
      studentType,
    });
  }

  try {
    // Check if email exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      errors.push({ msg: 'Email is already registered' });
      return res.render('auth/register', {
        title: 'Register',
        theme: req.cookies.theme || 'dark',
        errors,
        name,
        email,
        age,
        year,
        schoolName,
        studentPhoneNumber,
        parentPhoneNumber,
        curriculum,
        studentType,
      });
    }

    // Check if student phone number exists
    const existingPhone = await User.findOne({
      studentPhoneNumber: studentPhoneNumber.trim(),
    });

    if (existingPhone) {
      errors.push({ msg: 'Student phone number is already registered' });
      return res.render('auth/register', {
        title: 'Register',
        theme: req.cookies.theme || 'dark',
        errors,
        name,
        email,
        age,
        year,
        schoolName,
        studentPhoneNumber,
        parentPhoneNumber,
        curriculum,
        studentType,
      });
    }

    // Remove the student number check since it's auto-generated
    // Create new user
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      age: parseInt(age),
      year,
      schoolName: schoolName.trim(),
      studentPhoneNumber: studentPhoneNumber.trim(),
      parentPhoneNumber: parentPhoneNumber.trim(),
      curriculum,
      studentType,
      isActive: false, // New users need admin approval
    });

    const savedUser = await newUser.save();

    // Show success page with student code
    res.render('auth/registration-success', {
      title: 'Registration Successful',
      theme: req.cookies.theme || 'dark',
      studentName: savedUser.name,
      studentCode: savedUser.studentCode,
    });
  } catch (err) {
    console.error('Registration error:', err);

    // Handle mongoose validation errors
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map((e) => ({
        msg: e.message,
      }));
      errors.push(...validationErrors);
      return res.render('auth/register', {
        title: 'Register',
        theme: req.cookies.theme || 'dark',
        errors,
        name,
        email,
        age,
        year,
        schoolName,
        studentPhoneNumber,
        parentPhoneNumber,
        curriculum,
        studentType,
      });
    }

    // Handle duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      errors.push({
        msg: `${
          field.charAt(0).toUpperCase() + field.slice(1)
        } is already in use`,
      });
      return res.render('auth/register', {
        title: 'Register',
        theme: req.cookies.theme || 'dark',
        errors,
        name,
        email,
        age,
        year,
        schoolName,
        studentPhoneNumber,
        parentPhoneNumber,
        curriculum,
        studentType,
      });
    }

    req.flash(
      'error_msg',
      'An error occurred during registration. Please try again.'
    );
    res.redirect('/auth/register');
  }
};

// Login user
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  let errors = [];

  // Validate input
  if (!email || !password) {
    errors.push({ msg: 'Please provide both email/phone and password' });
  }

  if (errors.length > 0) {
    return res.render('auth/login', {
      title: 'Login',
      theme: req.cookies.theme || 'dark',
      errors,
      email,
    });
  }

  try {
    let user;
    const inputValue = email.trim();

    // Check if input is an email or phone number
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;

    if (emailRegex.test(inputValue)) {
      // Find user by email (case-insensitive)
      user = await User.findOne({ email: inputValue.toLowerCase() });
    } else if (phoneRegex.test(inputValue)) {
      // Find user by student phone number
      user = await User.findOne({ studentPhoneNumber: inputValue });
    } else {
      errors.push({
        msg: 'Please enter a valid email address or phone number',
      });
      return res.render('auth/login', {
        title: 'Login',
        theme: req.cookies.theme || 'dark',
        errors,
        email,
      });
    }

    if (!user) {
      errors.push({ msg: 'Invalid email/phone or password' });
      return res.render('auth/login', {
        title: 'Login',
        theme: req.cookies.theme || 'dark',
        errors,
        email,
      });
    }

    // Match password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      errors.push({ msg: 'Invalid email/phone or password' });
      return res.render('auth/login', {
        title: 'Login',
        theme: req.cookies.theme || 'dark',
        errors,
        email,
      });
    }

      // Check if user is active (only for students)
      if (user.role === 'student' && user.isActive === false) {
        errors.push({
          msg: 'Your account is pending approval. Please contact the administrator or wait for approval.',
        });
        return res.render('auth/login', {
          title: 'Login',
          theme: req.cookies.theme || 'dark',
          errors,
          email,
        });
      }

    // Create session
    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      age: user.age,
      year: user.year,
      schoolName: user.schoolName,
      studentCode: user.studentCode,
      studentPhoneNumber: user.studentPhoneNumber,
      curriculum: user.curriculum,
      studentType: user.studentType,
      isActive: user.isActive,
    };

    // Redirect based on role
    if (user.role === 'admin') {
      res.redirect('/admin/dashboard');
    } else {
      res.redirect('/student/dashboard');
    }
  } catch (err) {
    console.error('Login error:', err);
    errors.push({ msg: 'An error occurred during login. Please try again.' });
    return res.render('auth/login', {
      title: 'Login',
      theme: req.cookies.theme || 'dark',
      errors,
      email,
    });
  }
};

// Logout user
const logoutUser = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.redirect('/');
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
};

module.exports = {
  getLoginPage,
  getRegisterPage,
  registerUser,
  loginUser,
  logoutUser,
};

