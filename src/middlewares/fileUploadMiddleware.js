const multer = require('multer');

const storage = multer.memoryStorage();

const BLOCKED_TYPES = [
  'application/x-msdownload',
  'application/x-sh',
  'application/x-bat',
  'text/javascript',
  'application/x-php'
];

const GLOBAL_MAX_SIZE = 20 * 1024 * 1024;

const globalUpload = multer({
  storage: storage,
  limits: { fileSize: GLOBAL_MAX_SIZE },
  fileFilter: function(req, file, cb) {
    if (BLOCKED_TYPES.includes(file.mimetype)) {
      return cb(new Error('File type not permitted'));
    }
    cb(null, true);
  }
});

function globalFileMiddleware(req, res, next) {
  globalUpload.any()(req, res, function(err) {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (req.files && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
}

module.exports = { globalFileMiddleware: globalFileMiddleware };