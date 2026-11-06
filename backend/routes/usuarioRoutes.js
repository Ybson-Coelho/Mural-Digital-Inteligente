const express = require("express");
const router = express.Router();
const usuarioController = require("../controllers/usuarioController");
const { exigirLogin, exigirPermissao } = require("../middlewares/auth");

const gerenciarUsuarios = [
  exigirLogin,
  exigirPermissao("gerenciar_usuarios"),
];

router.get(
  "/permissoes",
  gerenciarUsuarios,
  usuarioController.listarPermissoes,
);

router.get("/usuarios", gerenciarUsuarios, usuarioController.listarUsuarios);

router.get(
  "/usuarios/:id",
  gerenciarUsuarios,
  usuarioController.obterUsuario,
);

router.post("/usuarios", gerenciarUsuarios, usuarioController.cadastrarUsuario);

router.put(
  "/usuarios/:id",
  gerenciarUsuarios,
  usuarioController.atualizarUsuario,
);

router.delete(
  "/usuarios/:id",
  gerenciarUsuarios,
  usuarioController.excluirUsuario,
);

router.post(
  "/usuarios/:id/senha-temporaria",
  gerenciarUsuarios,
  usuarioController.gerarNovaSenhaTemporaria,
);

module.exports = router;
