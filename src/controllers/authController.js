const User = require('../models/User');
const jwt = require('jsonwebtoken');
// ─── REGISTER ─────────────────────────────────────────────────────────────────
async function register(req, res) {
    try {
      // Step 1: Read data from request body
      const name = req.body.name;
      const email = req.body.email;
      const password = req.body.password;
  
      // Step 2: Check if email already exists
      const existingUser = await User.findOne({ email: email });
      if (existingUser) {
        return res.json({ success: false, message: 'Email already registered' });
      }
  
      // Step 3: Create user
      const user = new User();
      user.name = name;
      user.email = email;
      user.password = password;
      await user.save();
  
      // Step 4: Send response
      return res.json({
        success: true,
        message: 'User registered successfully',
        data: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      });
  
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, message: "Something went wrong in register" });
    }
  }
  
  // ─── LOGIN ────────────────────────────────────────────────────────────────────
  async function login(req, res) {
    try {
      // Step 1: Read email and password from request
      const email = req.body.email;
      const password = req.body.password;
  
      // Step 2: Find user by email (also fetch password field)
      const user = await User.findOne({ email: email }).select('+password');
      if (!user) {
        return res.json({ success: false, message: 'Invalid email or password' });
      }
  
      // Step 3: Check if password is correct
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.json({ success: false, message: 'Invalid email or password' });
      }
  
      // Step 4: Generate JWT token
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN }
      );
  
      // Step 5: Send response with token
      return res.json({
        success: true,
        message: 'Login successful',
        data: {
          token: token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email
          }
        }
      });
  
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
  
  // ─── GET PROFILE (protected route) ───────────────────────────────────────────
  async function getProfile(req, res) {
    try {
      // Step 1: Read token from Authorization header
      const authHeader = req.headers['authorization'];
      if (!authHeader) {
        return res.json({ success: false, message: 'No token provided' });
      }
  
      // Step 2: Extract token (header format is "Bearer <token>")
      const token = authHeader.split(' ')[1];
  
      // Step 3: Verify token is valid and not expired
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  
      // Step 4: Find user by id stored inside the token
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.json({ success: false, message: 'User not found' });
      }
  
      // Step 5: Send user profile
      return res.json({
        success: true,
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
  
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.json({ success: false, message: 'Invalid or expired token' });
      }
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  module.exports = { register: register, login: login, getProfile: getProfile };