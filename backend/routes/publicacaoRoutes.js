const express = require("express");
const router = express.Router();
const publicacaoController = require("../controllers/publicacaoController");
const { exigirLogin } = require("../middlewares/auth");
const { upload } = require("../config/upload");

router.get("/publicacoes", publicacaoController.listarPublicacoes);
router.post(
  "/publicacoes",
  exigirLogin,
  upload.single("arquivo"),
  publicacaoController.criarPublicacao,
);
router.put(
  "/publicacoes/:id",
  exigirLogin,
  upload.single("arquivo"),
  publicacaoController.atualizarPublicacao,
);
router.delete(
  "/publicacoes/:id",
  exigirLogin,
  publicacaoController.excluirPublicacao,
);

module.exports = router;
