const db = require("../db/database");

function buscarPermissoes(idUsuario) {
  return db
    .prepare(`
      SELECT
        p.id_permissoes,
        p.nome_permissoes,
        p.descricao_permissoes
      FROM permissoes p
      INNER JOIN usuario_permissoes up
        ON up.fk_permissoes = p.id_permissoes
      WHERE up.fk_usuario = ?
      ORDER BY p.nome_permissoes
    `)
    .all(idUsuario);
}

function usuarioTemPermissao(idUsuario, nomePermissao) {
  return buscarPermissoes(idUsuario).some(
    (permissao) => permissao.nome_permissoes === nomePermissao,
  );
}

function exigirSessao(req, res, next) {
  if (!req.session.usuario) {
    return res.status(401).json({
      erro: "Faça login para continuar.",
    });
  }
  next();
}

function precisaTrocarSenha(idUsuario) {
  const usuario = db
    .prepare(
      "SELECT precisa_trocar_senha FROM usuario WHERE id_usuario = ?",
    )
    .get(idUsuario);

  return Boolean(usuario && usuario.precisa_trocar_senha);
}

function exigirLogin(req, res, next) {
  if (!req.session.usuario) {
    return res.status(401).json({
      erro: "Faça login para continuar.",
    });
  }

  try {
    if (precisaTrocarSenha(req.session.usuario.id_usuario)) {
      return res.status(403).json({
        erro: "Troque sua senha para continuar.",
        precisaTrocarSenha: true,
      });
    }
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({
      erro: "Não foi possível verificar o usuário.",
    });
  }

  next();
}

function exigirPermissao(nomePermissao) {
  return (req, res, next) => {
    try {
      if (!req.session.usuario) {
        return res.status(401).json({
          erro: "Faça login para continuar.",
        });
      }

      const idUsuario = req.session.usuario.id_usuario;

      if (!usuarioTemPermissao(idUsuario, nomePermissao)) {
        return res.status(403).json({
          erro: "Você não tem permissão para realizar esta ação.",
        });
      }

      next();
    } catch (erro) {
      console.error(erro);
      res.status(500).json({
        erro: "Não foi possível verificar as permissões.",
      });
    }
  };
}

function obterPermissoesUsuario(idUsuario) {
  return buscarPermissoes(idUsuario).map(
    (permissao) => permissao.nome_permissoes,
  );
}

function verificarPermissaoPublicacao(idUsuario, tipo) {
  const permissaoPorTipo = {
    noticia: "gerenciar_noticias",
    evento: "gerenciar_eventos",
    video: "gerenciar_videos",
  };

  return usuarioTemPermissao(idUsuario, permissaoPorTipo[tipo]);
}

module.exports = {
  exigirSessao,
  exigirLogin,
  exigirPermissao,
  obterPermissoesUsuario,
  usuarioTemPermissao,
  verificarPermissaoPublicacao,
};

