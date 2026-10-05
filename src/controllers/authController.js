const authService = require('../services/authService');

async function register(req, res) {
  try {
    const data = await authService.register(req.body.name, req.body.email, req.body.password);
    return res.json({ success: true, message: 'User registered successfully', data: data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function login(req, res) {
  try {
    const data = await authService.login(req.body.email, req.body.password);
    return res.json({ success: true, message: 'Login successful', data: data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getProfile(req, res) {
  try {
    const data = await authService.getProfile(req.userId);
    return res.json({ success: true, data: data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { register: register, login: login, getProfile: getProfile };