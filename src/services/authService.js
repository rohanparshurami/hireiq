const User = require('../models/User');
const jwt = require('jsonwebtoken');

async function register(name, email, password) {
  if (!name) return { success: false, message: 'Name is required' };
  if (name.length < 2) return { success: false, message: 'Name must be at least 2 characters' };
  if (!email) return { success: false, message: 'Email is required' };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { success: false, message: 'Please enter a valid email' };
  if (!password) return { success: false, message: 'Password is required' };
  if (password.length < 6) return { success: false, message: 'Password must be at least 6 characters' };

  const existingUser = await User.findOne({ email: email });
  if (existingUser) return { success: false, message: 'Email already registered' };

  const user = new User();
  user.name = name;
  user.email = email;
  user.password = password;
  await user.save();

  return {
    success: true,
    message: 'User registered successfully',
    data: { id: user._id, name: user.name, email: user.email }
  };
}

async function login(email, password) {
  if (!email) return { success: false, message: 'Email is required' };
  if (!password) return { success: false, message: 'Password is required' };

  const user = await User.findOne({ email: email }).select('+password');
  if (!user) return { success: false, message: 'Invalid email or password' };

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) return { success: false, message: 'Invalid email or password' };

  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN }
  );

  return {
    success: true,
    message: 'Login successful',
    data: { token: token, user: { id: user._id, name: user.name, email: user.email } }
  };
}

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) return { success: false, message: 'User not found' };

  return {
    success: true,
    data: { id: user._id, name: user.name, email: user.email, role: user.role }
  };
}

module.exports = { register: register, login: login, getProfile: getProfile };