const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { Router } = require("express");
const multer = require("multer");
const { httpError } = require("../../utils/http-error");

const UPLOAD_DIR = path.join(__dirname, "../../../uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(httpError(400, `Unsupported file type: ${file.mimetype}`));
    }
    cb(null, true);
  },
});

const uploadRoutes = Router();

uploadRoutes.post("/", (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (error instanceof multer.MulterError) return next(httpError(400, error.message));
    if (error) return next(error);
    if (!req.file) return next(httpError(400, "file is required"));

    res.status(201).json({
      data: {
        url: `/uploads/${req.file.filename}`,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    });
  });
});

module.exports = { uploadRoutes, UPLOAD_DIR };
