const jwt = require('jsonwebtoken');

async function protect(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    req.userId = decoded.userId;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.json({ success: false, message: 'Invalid or expired token' });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { protect: protect };