const authService = require('../services/authService');

async function register(req, res) {
  try {
    const result = await authService.register(req.body.name, req.body.email, req.body.password);
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: 'Something went wrong, please try again' });
  }
}

async function login(req, res) {
  try {
    const result = await authService.login(req.body.email, req.body.password);
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: 'Something went wrong, please try again' });
  }
}

async function getProfile(req, res) {
  try {
    const result = await authService.getProfile(req.userId);
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: 'Something went wrong, please try again' });
  }
}

module.exports = { register: register, login: login, getProfile: getProfile };