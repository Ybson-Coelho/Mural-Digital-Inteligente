const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("../db/database");
const {
  emailValido,
  MENSAGEM_EMAIL_INVALIDO,
} = require("../config/email");

function gerarSenhaTemporaria() {
  return crypto.randomBytes(5).toString("hex");
}

function buscarPermissoesDoUsuario(idUsuario) {
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

function contarUsuariosComPermissao(nomePermissao, ignorarId) {
  return db
    .prepare(`
      SELECT COUNT(*) AS total
      FROM usuario u
      INNER JOIN usuario_permissoes up
        ON up.fk_usuario = u.id_usuario
      INNER JOIN permissoes p
        ON p.id_permissoes = up.fk_permissoes
      WHERE p.nome_permissoes = ?
        AND u.id_usuario <> ?
    `)
    .get(nomePermissao, ignorarId || 0).total;
}

function validarPermissoes(recebidas) {
  const lista = Array.isArray(recebidas) ? recebidas : [];

  if (lista.length === 0) {
    return { erro: "Selecione pelo menos uma permissão." };
  }

  const consultaId = db.prepare(`
    SELECT id_permissoes, nome_permissoes
    FROM permissoes
    WHERE id_permissoes = ?
  `);

  const consultaNome = db.prepare(`
    SELECT id_permissoes, nome_permissoes
    FROM permissoes
    WHERE nome_permissoes = ?
  `);

  const encontradas = [];

  for (const item of lista) {
    let permissao = null;

    if (
      typeof item === "number" ||
      (typeof item === "string" && /^\d+$/.test(item))
    ) {
      permissao = consultaId.get(Number(item));
    } else if (typeof item === "string" && item.trim()) {
      permissao = consultaNome.get(item.trim());
    }

    if (!permissao) {
      return { erro: "Uma ou mais permissões não existem." };
    }

    encontradas.push(permissao);
  }

  const unicas = [
    ...new Map(
      encontradas.map((permissao) => [permissao.id_permissoes, permissao]),
    ).values(),
  ];

  return { permissoes: unicas };
}

function listarPermissoes(req, res) {
  try {
    const permissoes = db
      .prepare(`
        SELECT
          id_permissoes,
          nome_permissoes,
          descricao_permissoes
        FROM permissoes
        ORDER BY nome_permissoes
      `)
      .all();

    res.json(permissoes);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      erro: "Não foi possível carregar as permissões.",
    });
  }
}

function listarUsuarios(req, res) {
  try {
    const usuarios = db
      .prepare(`
        SELECT
          id_usuario,
          nome_usuario,
          email_usuario,
          precisa_trocar_senha
        FROM usuario
        ORDER BY nome_usuario
      `)
      .all();

    for (const usuario of usuarios) {
      usuario.permissoes = buscarPermissoesDoUsuario(usuario.id_usuario);
      usuario.precisa_trocar_senha = Boolean(usuario.precisa_trocar_senha);
    }

    res.json(usuarios);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      erro: "Não foi possível carregar os usuários.",
    });
  }
}

function obterUsuario(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        erro: "Usuário inválido.",
      });
    }

    const usuario = db
      .prepare(`
        SELECT
          id_usuario,
          nome_usuario,
          email_usuario,
          precisa_trocar_senha
        FROM usuario
        WHERE id_usuario = ?
      `)
      .get(id);

    if (!usuario) {
      return res.status(404).json({
        erro: "Usuário não encontrado.",
      });
    }

    usuario.permissoes = buscarPermissoesDoUsuario(id);
    usuario.precisa_trocar_senha = Boolean(usuario.precisa_trocar_senha);

    res.json(usuario);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      erro: "Não foi possível carregar o usuário.",
    });
  }
}

function cadastrarUsuario(req, res) {
  try {
    const nome = String(req.body.nome || req.body.nome_usuario || "").trim();
    const email = String(req.body.email || req.body.email_usuario || "")
      .trim()
      .toLowerCase();

    if (nome.length < 2 || nome.length > 250) {
      return res.status(400).json({
        erro: "O nome deve ter entre 2 e 250 caracteres.",
      });
    }

    if (!emailValido(email) || email.length > 250) {
      return res.status(400).json({
        erro: MENSAGEM_EMAIL_INVALIDO,
      });
    }

    const { erro, permissoes } = validarPermissoes(req.body.permissoes);

    if (erro) {
      return res.status(400).json({ erro });
    }

    const existente = db
      .prepare(`
        SELECT id_usuario
        FROM usuario
        WHERE lower(email_usuario) = ?
      `)
      .get(email);

    if (existente) {
      return res.status(409).json({
        erro: "Esse e-mail já está cadastrado.",
      });
    }

    const senhaTemporaria = gerarSenhaTemporaria();

    const cadastrar = db.transaction(() => {
      const resultado = db
        .prepare(`
          INSERT INTO usuario (
            nome_usuario,
            email_usuario,
            matricula_usuario,
            senha_usuario,
            precisa_trocar_senha
          )
          VALUES (?, ?, NULL, ?, 1)
        `)
        .run(nome, email, bcrypt.hashSync(senhaTemporaria, 12));

      const idUsuario = Number(resultado.lastInsertRowid);

      const inserirVinculo = db.prepare(`
        INSERT INTO usuario_permissoes (
          fk_usuario,
          fk_permissoes
        )
        VALUES (?, ?)
      `);

      for (const permissao of permissoes) {
        inserirVinculo.run(idUsuario, permissao.id_permissoes);
      }

      return idUsuario;
    });

    const idUsuario = cadastrar();

    res.status(201).json({
      mensagem: "Usuário cadastrado com sucesso.",
      senhaTemporaria,
      usuario: {
        id_usuario: idUsuario,
        nome_usuario: nome,
        email_usuario: email,
        precisa_trocar_senha: true,
        permissoes,
      },
    });
  } catch (erro) {
    console.error(erro);

    if (
      String(erro.code || "").includes("SQLITE_CONSTRAINT_UNIQUE") ||
      String(erro.message || "").includes("UNIQUE constraint failed")
    ) {
      return res.status(409).json({
        erro: "Esse e-mail já está cadastrado.",
      });
    }

    res.status(500).json({
      erro: "Não foi possível cadastrar o usuário.",
    });
  }
}

function atualizarUsuario(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        erro: "Usuário inválido.",
      });
    }

    const usuario = db
      .prepare(`
        SELECT id_usuario, nome_usuario, email_usuario
        FROM usuario
        WHERE id_usuario = ?
      `)
      .get(id);

    if (!usuario) {
      return res.status(404).json({
        erro: "Usuário não encontrado.",
      });
    }

    const nome = String(req.body.nome || req.body.nome_usuario || "").trim();
    const email = String(req.body.email || req.body.email_usuario || "")
      .trim()
      .toLowerCase();

    if (nome.length < 2 || nome.length > 250) {
      return res.status(400).json({
        erro: "O nome deve ter entre 2 e 250 caracteres.",
      });
    }

    if (!emailValido(email) || email.length > 250) {
      return res.status(400).json({
        erro: MENSAGEM_EMAIL_INVALIDO,
      });
    }

    const { erro, permissoes } = validarPermissoes(req.body.permissoes);

    if (erro) {
      return res.status(400).json({ erro });
    }

    const existente = db
      .prepare(`
        SELECT id_usuario
        FROM usuario
        WHERE lower(email_usuario) = ?
          AND id_usuario <> ?
      `)
      .get(email, id);

    if (existente) {
      return res.status(409).json({
        erro: "Esse e-mail já está cadastrado.",
      });
    }

    const permissoesAtuais = buscarPermissoesDoUsuario(id).map(
      (permissao) => permissao.nome_permissoes,
    );

    const mantemGerenciarUsuarios = permissoes.some(
      (permissao) => permissao.nome_permissoes === "gerenciar_usuarios",
    );

    const propriaConta = Boolean(
      req.session.usuario && req.session.usuario.id_usuario === id,
    );

    if (
      propriaConta &&
      permissoesAtuais.includes("gerenciar_usuarios") &&
      !mantemGerenciarUsuarios
    ) {
      return res.status(400).json({
        erro: "Você não pode remover a sua própria permissão de gerenciar usuários.",
      });
    }

    if (
      permissoesAtuais.includes("gerenciar_usuarios") &&
      !mantemGerenciarUsuarios &&
      contarUsuariosComPermissao("gerenciar_usuarios", id) === 0
    ) {
      return res.status(400).json({
        erro: "O sistema precisa de pelo menos um usuário que gerencia usuários.",
      });
    }

    const atualizar = db.transaction(() => {
      db.prepare(`
        UPDATE usuario
        SET nome_usuario = ?, email_usuario = ?
        WHERE id_usuario = ?
      `).run(nome, email, id);

      db.prepare("DELETE FROM usuario_permissoes WHERE fk_usuario = ?").run(id);

      const inserirVinculo = db.prepare(`
        INSERT INTO usuario_permissoes (
          fk_usuario,
          fk_permissoes
        )
        VALUES (?, ?)
      `);

      for (const permissao of permissoes) {
        inserirVinculo.run(id, permissao.id_permissoes);
      }
    });

    atualizar();

    if (req.session.usuario && req.session.usuario.id_usuario === id) {
      req.session.usuario.nome_usuario = nome;
      req.session.usuario.email_usuario = email;
    }

    res.json({
      mensagem: "Usuário atualizado com sucesso.",
      usuario: {
        id_usuario: id,
        nome_usuario: nome,
        email_usuario: email,
        permissoes,
      },
    });
  } catch (erro) {
    console.error(erro);

    if (
      String(erro.code || "").includes("SQLITE_CONSTRAINT_UNIQUE") ||
      String(erro.message || "").includes("UNIQUE constraint failed")
    ) {
      return res.status(409).json({
        erro: "Esse e-mail já está cadastrado.",
      });
    }

    res.status(500).json({
      erro: "Não foi possível atualizar o usuário.",
    });
  }
}

function excluirUsuario(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        erro: "Usuário inválido.",
      });
    }

    if (req.session.usuario && req.session.usuario.id_usuario === id) {
      return res.status(400).json({
        erro: "Você não pode excluir o seu próprio usuário.",
      });
    }

    const usuario = db
      .prepare("SELECT id_usuario FROM usuario WHERE id_usuario = ?")
      .get(id);

    if (!usuario) {
      return res.status(404).json({
        erro: "Usuário não encontrado.",
      });
    }

    const permissoes = buscarPermissoesDoUsuario(id).map(
      (permissao) => permissao.nome_permissoes,
    );

    if (
      permissoes.includes("gerenciar_usuarios") &&
      contarUsuariosComPermissao("gerenciar_usuarios", id) === 0
    ) {
      return res.status(400).json({
        erro: "O sistema precisa de pelo menos um usuário que gerencia usuários.",
      });
    }

    const excluir = db.transaction(() => {
      db.prepare("DELETE FROM usuario_permissoes WHERE fk_usuario = ?").run(id);
      db.prepare("DELETE FROM usuario WHERE id_usuario = ?").run(id);
    });

    excluir();

    res.json({
      mensagem: "Usuário excluído.",
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      erro: "Não foi possível excluir o usuário.",
    });
  }
}

function gerarNovaSenhaTemporaria(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        erro: "Usuário inválido.",
      });
    }

    const usuario = db
      .prepare("SELECT id_usuario FROM usuario WHERE id_usuario = ?")
      .get(id);

    if (!usuario) {
      return res.status(404).json({
        erro: "Usuário não encontrado.",
      });
    }

    const senhaTemporaria = gerarSenhaTemporaria();

    db.prepare(`
      UPDATE usuario
      SET senha_usuario = ?, precisa_trocar_senha = 1
      WHERE id_usuario = ?
    `).run(bcrypt.hashSync(senhaTemporaria, 12), id);

    if (req.session.usuario && req.session.usuario.id_usuario === id) {
      req.session.usuario.precisa_trocar_senha = 1;
    }

    res.json({
      mensagem: "Nova senha temporária gerada.",
      senhaTemporaria,
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      erro: "Não foi possível gerar a senha temporária.",
    });
  }
}

module.exports = {
  listarPermissoes,
  listarUsuarios,
  obterUsuario,
  cadastrarUsuario,
  atualizarUsuario,
  excluirUsuario,
  gerarNovaSenhaTemporaria,
};
