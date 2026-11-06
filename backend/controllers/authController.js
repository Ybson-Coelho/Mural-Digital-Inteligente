const bcrypt = require("bcryptjs");
const db = require("../db/database");
const { obterPermissoesUsuario } = require("../middlewares/auth");
const { emailValido } = require("../config/email");

function obterSessao(req, res) {
  try {
    if (!req.session.usuario) {
      return res.json({
        autenticado: false,
      });
    }

    const usuario = db
      .prepare(
        "SELECT id_usuario, precisa_trocar_senha FROM usuario WHERE id_usuario = ?",
      )
      .get(req.session.usuario.id_usuario);

    if (!usuario) {
      req.session.destroy(() => {});
      return res.json({
        autenticado: false,
      });
    }

    const permissoes = obterPermissoesUsuario(usuario.id_usuario);

    res.json({
      autenticado: true,
      usuario: {
        ...req.session.usuario,
        precisa_trocar_senha: usuario.precisa_trocar_senha,
      },
      permissoes,
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      erro: "Erro ao consultar a sessão.",
    });
  }
}

function login(req, res) {
  try {
    const email = String(req.body.email || req.body.email_usuario || "")
      .trim()
      .toLowerCase();

    const senha = String(req.body.senha || req.body.senha_usuario || "");

    if (!email || !senha) {
      return res.status(400).json({
        erro: "Informe o e-mail e a senha.",
      });
    }

    if (!emailValido(email)) {
      return res.status(401).json({
        erro: "E-mail ou senha incorretos.",
      });
    }

    const usuario = db
      .prepare(`
        SELECT
          id_usuario,
          nome_usuario,
          email_usuario,
          senha_usuario,
          precisa_trocar_senha
        FROM usuario
        WHERE lower(email_usuario) = ?
      `)
      .get(email);

    if (!usuario || !bcrypt.compareSync(senha, usuario.senha_usuario)) {
      return res.status(401).json({
        erro: "E-mail ou senha incorretos.",
      });
    }

    req.session.regenerate((erro) => {
      if (erro) {
        console.error(erro);
        return res.status(500).json({
          erro: "Não foi possível iniciar a sessão.",
        });
      }

      req.session.usuario = {
        id_usuario: usuario.id_usuario,
        nome_usuario: usuario.nome_usuario,
        email_usuario: usuario.email_usuario,
        precisa_trocar_senha: usuario.precisa_trocar_senha,
      };

      req.session.save((erroSalvar) => {
        if (erroSalvar) {
          console.error(erroSalvar);
          return res.status(500).json({
            erro: "Não foi possível salvar a sessão.",
          });
        }

        const permissoes = obterPermissoesUsuario(usuario.id_usuario);

        res.json({
          mensagem: "Login realizado com sucesso.",
          usuario: req.session.usuario,
          permissoes,
          precisaTrocarSenha: Boolean(usuario.precisa_trocar_senha),
        });
      });
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      erro: "Erro ao realizar login.",
    });
  }
}

function trocarSenha(req, res) {
  try {
    const idUsuario = req.session.usuario.id_usuario;
    const senhaNova = String(req.body.senhaNova || "");
    const confirmacao = String(req.body.confirmacao || "");

    if (senhaNova.length < 6) {
      return res.status(400).json({
        erro: "A nova senha deve ter pelo menos 6 caracteres.",
      });
    }

    if (senhaNova !== confirmacao) {
      return res.status(400).json({
        erro: "A confirmação da senha não confere.",
      });
    }

    const usuario = db
      .prepare(
        "SELECT senha_usuario FROM usuario WHERE id_usuario = ?",
      )
      .get(idUsuario);

    if (!usuario) {
      return res.status(404).json({
        erro: "Usuário não encontrado.",
      });
    }

    if (bcrypt.compareSync(senhaNova, usuario.senha_usuario)) {
      return res.status(400).json({
        erro: "A nova senha deve ser diferente da senha atual.",
      });
    }

    db.prepare(`
      UPDATE usuario
      SET senha_usuario = ?, precisa_trocar_senha = 0
      WHERE id_usuario = ?
    `).run(bcrypt.hashSync(senhaNova, 12), idUsuario);

    if (req.session.usuario) {
      req.session.usuario.precisa_trocar_senha = 0;
    }

    res.json({
      mensagem: "Senha alterada com sucesso.",
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      erro: "Não foi possível alterar a senha.",
    });
  }
}

function logout(req, res) {
  req.session.destroy((erro) => {
    if (erro) {
      return res.status(500).json({
        erro: "Não foi possível sair.",
      });
    }

    res.clearCookie("viva.sid", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    res.json({
      mensagem: "Você saiu do sistema.",
    });
  });
}

module.exports = {
  obterSessao,
  login,
  trocarSenha,
  logout,
};
