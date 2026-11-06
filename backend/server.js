const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const cors = require("cors");
const multer = require("multer");

require("./db/database");

const { FRONTEND_URL } = require("./config/frontend");
const { pastaUploads } = require("./config/upload");
const authRoutes = require("./routes/authRoutes");
const usuarioRoutes = require("./routes/usuarioRoutes");
const publicacaoRoutes = require("./routes/publicacaoRoutes");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(
  cors({
    origin: [FRONTEND_URL],
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  console.error(
    "Configure SESSION_SECRET no arquivo .env com pelo menos 32 caracteres.",
  );
  process.exit(1);
}

app.use(
  session({
    name: "viva.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 2,
    },
  }),
);

app.use("/uploads", express.static(pastaUploads));

app.use("/api", authRoutes);
app.use("/api", usuarioRoutes);
app.use("/api", publicacaoRoutes);

app.use((req, res) => {
  res.status(404).json({
    erro: "Rota não encontrada.",
  });
});

app.use((erro, req, res, next) => {
  if (erro instanceof multer.MulterError) {
    return res.status(400).json({
      erro:
        erro.code === "LIMIT_FILE_SIZE"
          ? "O arquivo ultrapassa o limite de 100 MB."
          : "Não foi possível receber o arquivo.",
    });
  }

  if (erro) {
    return res.status(400).json({
      erro: erro.message || "Arquivo inválido.",
    });
  }

  next();
});

app.listen(PORT, () => {
  console.log(`API do Mural Digital IFTO rodando em http://localhost:${PORT}`);
});

