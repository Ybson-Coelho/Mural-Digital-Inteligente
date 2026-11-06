const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { exigirSessao } = require("../middlewares/auth");

router.get("/sessao", authController.obterSessao);
router.post("/login", authController.login);
router.post("/trocar-senha", exigirSessao, authController.trocarSenha);
router.post("/logout", exigirSessao, authController.logout);

module.exports = router;
