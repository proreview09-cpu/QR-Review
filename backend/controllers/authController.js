const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { log } = require('../services/logService');

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'shop_owner',
      isActive: true,
    });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    log('CREATE', 'auth', `New owner registered: ${user.email}`, { performedBy: user.email });
    res.status(201).json({ token, user });
  } catch (error) {
    log('ERROR', 'auth', `Registration error: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      log('ERROR', 'auth', `Failed login attempt: ${email}`, { details: 'User not found or inactive', ip: req.ip });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      log('ERROR', 'auth', `Failed login attempt: ${email}`, { details: 'Wrong password', ip: req.ip });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    log('LOGIN', 'auth', `${user.name} (${user.role}) logged in`, { performedBy: user.email, ip: req.ip });
    res.json({ token, user });
  } catch (error) {
    log('ERROR', 'auth', `Login error: ${error.message}`, { ip: req.ip });
    res.status(500).json({ message: error.message });
  }
};

exports.getMe = async (req, res) => {
  res.json({ user: req.user });
};
