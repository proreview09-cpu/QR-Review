const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { log } = require('../services/logService');

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
