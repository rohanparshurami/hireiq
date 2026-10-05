const User = require('../models/User');
const jwt = require('jsonwebtoken');

async function register(name, email, password) {
  const existingUser = await User.findOne({ email: email });
  if (existingUser) {
    throw new Error('Email already registered');
  }

  const user = new User();
  user.name = name;
  user.email = email;
  user.password = password;
  await user.save();

  return { id: user._id, name: user.name, email: user.email };
}

async function login(email, password) {
  const user = await User.findOne({ email: email }).select('+password');
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN }
  );

  return { token: token, user: { id: user._id, name: user.name, email: user.email } };
}

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

module.exports = { register: register, login: login, getProfile: getProfile };