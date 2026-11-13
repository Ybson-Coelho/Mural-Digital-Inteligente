const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");

const pastaUploads =
  process.env.UPLOAD_DIR || path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(pastaUploads, { recursive: true });

const armazenamentoUploads = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, pastaUploads);
  },
  filename: (_req, file, callback) => {
    const extensao = path
      .extname(file.originalname)
      .toLowerCase()
      .replace(/[^.a-z0-9]/g, "");

    const nomeArquivo = `${Date.now()}-${crypto
      .randomBytes(8)
      .toString("hex")}${extensao}`;

    callback(null, nomeArquivo);
  },
});

const upload = multer({
  storage: armazenamentoUploads,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const tiposImagem = ["image/jpeg", "image/png", "image/webp"];
    const tipo = file.mimetype || "";

    if (tiposImagem.includes(tipo) || tipo.startsWith("video/")) {
      return callback(null, true);
    }

    callback(new Error("Envie uma imagem jpg, png ou webp, ou um vídeo válido."));
  },
});

module.exports = {
  upload,
  pastaUploads,
};

