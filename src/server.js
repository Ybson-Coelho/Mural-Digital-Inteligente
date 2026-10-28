const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
});

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const multer = require("multer");
const helmet = require("helmet");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

function emailPermitido(email) {
  const padraoEmail = /^[^\s@]+@(?:gmail\.com|estudante\.ifto\.edu\.br)$/i;
  return padraoEmail.test(email);
}

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  console.error(
    "Configure SESSION_SECRET no arquivo .env com pelo menos 32 caracteres.",
  );
  process.exit(1);
}

const pastaDados = path.join(__dirname, "..", "dados");
fs.mkdirSync(pastaDados, { recursive: true });

const db = new Database(path.join(pastaDados, "viva_ciencia.sqlite"));
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS publicacao (
    numero_public INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo_public TEXT NOT NULL,
    data_public TEXT NOT NULL,
    data_fim_public TEXT NOT NULL,
    tipo_public TEXT,
    tempo_exibicao_public INTEGER DEFAULT 10,
    arquivo_public TEXT
  );

  CREATE TABLE IF NOT EXISTS noticia (
    fk_public INTEGER PRIMARY KEY,
    tempo_exibicao_not INTEGER NOT NULL,
    categoria_not TEXT NOT NULL,
    descricao_not TEXT NOT NULL,
    FOREIGN KEY (fk_public) REFERENCES publicacao(numero_public)
  );

  CREATE TABLE IF NOT EXISTS evento (
    fb_public INTEGER PRIMARY KEY,
    tipo_evento TEXT NOT NULL,
    data_evento TEXT NOT NULL,
    poster_imagem_evento TEXT NOT NULL,
    descricao_evento TEXT NOT NULL,
    publico_evento TEXT NOT NULL,
    FOREIGN KEY (fb_public) REFERENCES publicacao(numero_public)
  );

  CREATE TABLE IF NOT EXISTS video (
    fp_public INTEGER PRIMARY KEY,
    duracao_video INTEGER NOT NULL,
    link_video TEXT NOT NULL,
    FOREIGN KEY (fp_public) REFERENCES publicacao(numero_public)
  );

  CREATE TABLE IF NOT EXISTS permissoes (
    id_permissoes INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_permissoes TEXT UNIQUE NOT NULL,
    descricao_permissoes TEXT
  );

  CREATE TABLE IF NOT EXISTS usuario (
    id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_usuario TEXT NOT NULL,
    email_usuario TEXT UNIQUE NOT NULL,
    senha_usuario TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS usuario_permissoes (
    fk_permissoes INTEGER NOT NULL,
    fk_usuario INTEGER NOT NULL,
    PRIMARY KEY (fk_permissoes, fk_usuario),
    FOREIGN KEY (fk_permissoes) REFERENCES permissoes(id_permissoes),
    FOREIGN KEY (fk_usuario) REFERENCES usuario(id_usuario)
  );
`);

const colunasPublicacao = db
  .prepare("PRAGMA table_info(publicacao)")
  .all()
  .map((coluna) => coluna.name);

const colunasPublicacaoNovas = [
  ["tipo_public", "TEXT"],
  ["tempo_exibicao_public", "INTEGER DEFAULT 10"],
  ["arquivo_public", "TEXT"],
];

for (const [nome, definicao] of colunasPublicacaoNovas) {
  if (!colunasPublicacao.includes(nome)) {
    db.exec(`ALTER TABLE publicacao ADD COLUMN ${nome} ${definicao}`);
  }
}

const colunasUsuario = db
  .prepare("PRAGMA table_info(usuario)")
  .all()
  .map((coluna) => coluna.name);

if (!colunasUsuario.includes("matricula_usuario")) {
  db.exec("ALTER TABLE usuario ADD COLUMN matricula_usuario TEXT");
}

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS usuario_matricula_unica
  ON usuario(matricula_usuario)
  WHERE matricula_usuario IS NOT NULL
`);

const pastaUploads = path.join(__dirname, "..", "uploads");
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
    const tipo = file.mimetype || "";
    if (tipo.startsWith("image/") || tipo.startsWith("video/")) {
      return callback(null, true);
    }
    callback(new Error("Envie um arquivo de imagem ou vídeo válido."));
  },
});

const permissoesIniciais = [
  ["gerenciar_usuarios", "Criar usuários e definir permissões"],
  ["gerenciar_noticias", "Criar e administrar notícias"],
  ["gerenciar_eventos", "Criar e administrar eventos"],
  ["gerenciar_videos", "Adicionar e administrar vídeos"],
  ["gerenciar_publicacoes", "Administrar publicações em geral"],
  ["visualizar_painel", "Acessar o painel administrativo"],
  ["acessar_configuracoes", "Acessar configurações do sistema"],
  ["visualizar_relatorios", "Visualizar relatórios do sistema"],
  ["excluir_dados", "Excluir dados do sistema"],
];

const inserirPermissao = db.prepare(`
  INSERT OR IGNORE INTO permissoes (
    nome_permissoes,
    descricao_permissoes
  )
  VALUES (?, ?)
`);

for (const permissao of permissoesIniciais) {
  inserirPermissao.run(...permissao);
}

const adminNome = (process.env.ADMIN_NOME || "Samuel Vieira de Souza").trim();
const adminEmail = (
  process.env.ADMIN_EMAIL || "samuel.souza7@estudante.ifto.edu.br"
)
  .trim()
  .toLowerCase();
const adminMatricula = (process.env.ADMIN_MATRICULA || "202512940007").trim();
const adminSenha = process.env.ADMIN_SENHA || "";

if (adminSenha.length >= 8 && emailPermitido(adminEmail) && adminMatricula) {
  const existenteEmail = db
    .prepare("SELECT id_usuario FROM usuario WHERE lower(email_usuario) = ?")
    .get(adminEmail);

  const existenteMatricula = db
    .prepare("SELECT id_usuario FROM usuario WHERE matricula_usuario = ?")
    .get(adminMatricula);

  if (
    existenteEmail &&
    existenteMatricula &&
    existenteEmail.id_usuario !== existenteMatricula.id_usuario
  ) {
    console.error(
      "Não foi possível preparar o administrador global: e-mail e matrícula já pertencem a contas diferentes.",
    );
    process.exit(1);
  }

  const idExistente =
    existenteEmail?.id_usuario || existenteMatricula?.id_usuario;
  const hashSenhaAdmin = bcrypt.hashSync(adminSenha, 12);

  let idAdmin;

  if (idExistente) {
    db.prepare(`
      UPDATE usuario
      SET
        nome_usuario = ?,
        email_usuario = ?,
        matricula_usuario = ?,
        senha_usuario = ?
      WHERE id_usuario = ?
    `).run(adminNome, adminEmail, adminMatricula, hashSenhaAdmin, idExistente);

    idAdmin = idExistente;
  } else {
    const insercaoAdmin = db
      .prepare(`
        INSERT INTO usuario (
          nome_usuario,
          email_usuario,
          matricula_usuario,
          senha_usuario
        )
        VALUES (?, ?, ?, ?)
      `)
      .run(adminNome, adminEmail, adminMatricula, hashSenhaAdmin);

    idAdmin = Number(insercaoAdmin.lastInsertRowid);
  }

  db.prepare("DELETE FROM usuario_permissoes WHERE fk_usuario = ?").run(
    idAdmin,
  );

  const idsPermissoes = db
    .prepare("SELECT id_permissoes FROM permissoes")
    .all();

  const vincularPermissao = db.prepare(`
    INSERT OR IGNORE INTO usuario_permissoes (
      fk_usuario,
      fk_permissoes
    )
    VALUES (?, ?)
  `);

  for (const permissao of idsPermissoes) {
    vincularPermissao.run(idAdmin, permissao.id_permissoes);
  }

  console.log("Administrador global configurado com todas as permissões.");
} else {
  console.warn(
    "Administrador global não foi criado/atualizado. Configure ADMIN_SENHA no arquivo .env com pelo menos 8 caracteres.",
  );
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

const pastaRaizProjeto = path.join(__dirname, "..");
const pastaPublica = path.join(__dirname, "public");

app.use(express.static(pastaPublica));
app.use("/uploads", express.static(pastaUploads));

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

function exigirLogin(req, res, next) {
  if (!req.session.usuario) {
    return res.status(401).json({
      erro: "Faça login para continuar.",
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

  return (
    usuarioTemPermissao(idUsuario, "gerenciar_publicacoes") ||
    usuarioTemPermissao(idUsuario, permissaoPorTipo[tipo])
  );
}

app.get("/api/sessao", (req, res) => {
  try {
    if (!req.session.usuario) {
      return res.json({
        autenticado: false,
      });
    }

    const permissoes = obterPermissoesUsuario(req.session.usuario.id_usuario);

    res.json({
      autenticado: true,
      usuario: req.session.usuario,
      permissoes,
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      erro: "Erro ao consultar a sessão.",
    });
  }
});

app.post("/api/login", (req, res) => {
  try {
    const email = String(req.body.email || req.body.email_usuario || "")
      .trim()
      .toLowerCase();

    const matricula = String(
      req.body.matricula || req.body.matricula_usuario || "",
    ).trim();

    const senha = String(req.body.senha || req.body.senha_usuario || "");

    if (!email || !matricula || !senha) {
      return res.status(400).json({
        erro: "Informe o e-mail, a matrícula e a senha.",
      });
    }

    if (!emailPermitido(email)) {
      return res.status(400).json({
        erro: "Informe um e-mail Gmail ou institucional do IFTO válido.",
      });
    }

    const usuario = db
      .prepare(`
        SELECT
          id_usuario,
          nome_usuario,
          email_usuario,
          matricula_usuario,
          senha_usuario
        FROM usuario
        WHERE lower(email_usuario) = ?
          AND matricula_usuario = ?
      `)
      .get(email, matricula);

    if (!usuario || !bcrypt.compareSync(senha, usuario.senha_usuario)) {
      return res.status(401).json({
        erro: "Gmail, matrícula ou senha incorretos.",
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
        matricula_usuario: usuario.matricula_usuario,
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
        });
      });
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      erro: "Erro ao realizar login.",
    });
  }
});

app.post("/api/logout", exigirLogin, (req, res) => {
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
});

app.get(
  "/api/permissoes",
  exigirLogin,
  exigirPermissao("gerenciar_usuarios"),
  (req, res) => {
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
  },
);

app.get(
  "/api/usuarios",
  exigirLogin,
  exigirPermissao("gerenciar_usuarios"),
  (req, res) => {
    try {
      const usuarios = db
        .prepare(`
          SELECT
            id_usuario,
            nome_usuario,
            email_usuario,
            matricula_usuario
          FROM usuario
          ORDER BY nome_usuario
        `)
        .all();

      const consultaPermissoes = db.prepare(`
        SELECT
          p.id_permissoes,
          p.nome_permissoes,
          p.descricao_permissoes
        FROM permissoes p
        INNER JOIN usuario_permissoes up
          ON up.fk_permissoes = p.id_permissoes
        WHERE up.fk_usuario = ?
        ORDER BY p.nome_permissoes
      `);

      for (const usuario of usuarios) {
        usuario.permissoes = consultaPermissoes.all(usuario.id_usuario);
      }

      res.json(usuarios);
    } catch (erro) {
      console.error(erro);
      res.status(500).json({
        erro: "Não foi possível carregar os usuários.",
      });
    }
  },
);

app.post(
  "/api/usuarios",
  exigirLogin,
  exigirPermissao("gerenciar_usuarios"),
  (req, res) => {
    try {
      const nome = String(req.body.nome || req.body.nome_usuario || "").trim();
      const email = String(req.body.email || req.body.email_usuario || "")
        .trim()
        .toLowerCase();
      const matricula = String(
        req.body.matricula || req.body.matricula_usuario || "",
      ).trim();
      const senha = String(req.body.senha || req.body.senha_usuario || "");
      const recebidas = Array.isArray(req.body.permissoes)
        ? req.body.permissoes
        : [];

      if (nome.length < 2 || nome.length > 250) {
        return res.status(400).json({
          erro: "O nome deve ter entre 2 e 250 caracteres.",
        });
      }

      if (!emailPermitido(email) || email.length > 250) {
        return res.status(400).json({
          erro: "Informe um e-mail Gmail ou institucional do IFTO válido.",
        });
      }

      if (!matricula || matricula.length > 100) {
        return res.status(400).json({
          erro: "Informe uma matrícula válida.",
        });
      }

      if (senha.length < 8) {
        return res.status(400).json({
          erro: "A senha deve ter pelo menos 8 caracteres.",
        });
      }

      if (recebidas.length === 0) {
        return res.status(400).json({
          erro: "Selecione pelo menos uma permissão.",
        });
      }

      const ids = [];
      const nomes = [];

      for (const item of recebidas) {
        if (
          typeof item === "number" ||
          (typeof item === "string" && /^\d+$/.test(item))
        ) {
          const id = Number(item);
          if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
              erro: "A lista de permissões é inválida.",
            });
          }
          ids.push(id);
        } else if (typeof item === "string" && item.trim()) {
          nomes.push(item.trim());
        } else {
          return res.status(400).json({
            erro: "A lista de permissões é inválida.",
          });
        }
      }

      const permissoesEncontradas = [];

      if (ids.length) {
        const consultaPorId = db.prepare(`
          SELECT id_permissoes, nome_permissoes
          FROM permissoes
          WHERE id_permissoes = ?
        `);

        for (const id of [...new Set(ids)]) {
          const permissao = consultaPorId.get(id);
          if (!permissao) {
            return res.status(400).json({
              erro: "Uma ou mais permissões não existem.",
            });
          }
          permissoesEncontradas.push(permissao);
        }
      }

      if (nomes.length) {
        const consultaPorNome = db.prepare(`
          SELECT id_permissoes, nome_permissoes
          FROM permissoes
          WHERE nome_permissoes = ?
        `);

        for (const nomePermissao of [...new Set(nomes)]) {
          const permissao = consultaPorNome.get(nomePermissao);
          if (!permissao) {
            return res.status(400).json({
              erro: `A permissão "${nomePermissao}" não existe.`,
            });
          }
          permissoesEncontradas.push(permissao);
        }
      }

      const permissoesUnicas = [
        ...new Map(
          permissoesEncontradas.map((permissao) => [
            permissao.id_permissoes,
            permissao,
          ]),
        ).values(),
      ];

      if (permissoesUnicas.length === 0) {
        return res.status(400).json({
          erro: "Selecione pelo menos uma permissão válida.",
        });
      }

      const existente = db
        .prepare(`
          SELECT id_usuario
          FROM usuario
          WHERE lower(email_usuario) = ?
            OR matricula_usuario = ?
        `)
        .get(email, matricula);

      if (existente) {
        return res.status(409).json({
          erro: "Essa matrícula ou esse e-mail já está cadastrado.",
        });
      }

      const cadastrar = db.transaction(() => {
        const resultado = db
          .prepare(`
            INSERT INTO usuario (
              nome_usuario,
              email_usuario,
              matricula_usuario,
              senha_usuario
            )
            VALUES (?, ?, ?, ?)
          `)
          .run(nome, email, matricula, bcrypt.hashSync(senha, 12));

        const inserirVinculo = db.prepare(`
          INSERT INTO usuario_permissoes (
            fk_usuario,
            fk_permissoes
          )
          VALUES (?, ?)
        `);

        for (const permissao of permissoesUnicas) {
          inserirVinculo.run(
            resultado.lastInsertRowid,
            permissao.id_permissoes,
          );
        }

        return Number(resultado.lastInsertRowid);
      });

      const idUsuario = cadastrar();

      res.status(201).json({
        mensagem: "Usuário cadastrado com sucesso.",
        usuario: {
          id_usuario: idUsuario,
          nome_usuario: nome,
          email_usuario: email,
          matricula_usuario: matricula,
        },
        permissoes: permissoesUnicas.map(
          (permissao) => permissao.nome_permissoes,
        ),
      });
    } catch (erro) {
      console.error(erro);

      if (
        String(erro.code || "").includes("SQLITE_CONSTRAINT_UNIQUE") ||
        String(erro.message || "").includes("UNIQUE constraint failed")
      ) {
        return res.status(409).json({
          erro: "Essa matrícula ou esse e-mail já está cadastrado.",
        });
      }

      res.status(500).json({
        erro: "Não foi possível cadastrar o usuário.",
      });
    }
  },
);

function obterPublicacoes() {
  const linhas = db
    .prepare(`
      SELECT
        p.numero_public,
        p.titulo_public,
        p.data_public,
        p.data_fim_public,
        p.tipo_public,
        p.tempo_exibicao_public,
        p.arquivo_public,
        n.categoria_not,
        n.descricao_not,
        e.tipo_evento,
        e.data_evento,
        e.poster_imagem_evento,
        e.descricao_evento,
        e.publico_evento,
        v.duracao_video,
        v.link_video
      FROM publicacao p
      LEFT JOIN noticia n
        ON n.fk_public = p.numero_public
      LEFT JOIN evento e
        ON e.fb_public = p.numero_public
      LEFT JOIN video v
        ON v.fp_public = p.numero_public
      ORDER BY p.numero_public DESC
    `)
    .all();

  return linhas.map((p) => ({
    id: p.numero_public,
    titulo: p.titulo_public,
    data: p.data_public,
    dataFinal: p.data_fim_public,
    tipo:
      p.tipo_public ||
      (p.categoria_not
        ? "noticia"
        : p.tipo_evento
          ? "evento"
          : p.link_video
            ? "video"
            : "noticia"),
    tempoTela: p.tempo_exibicao_public || p.tempo_exibicao_not || 10,
    categoria: p.categoria_not || "Geral",
    descricao: p.descricao_not || p.descricao_evento || "",
    tipoEvento: p.tipo_evento || "",
    dataEvento: p.data_evento || "",
    imagem: p.arquivo_public || p.poster_imagem_evento || "",
    publico: p.publico_evento || "",
    duracao: p.duracao_video || 0,
    url: p.link_video || "",
  }));
}

app.get("/api/publicacoes", (req, res) => {
  try {
    res.json(obterPublicacoes());
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      erro: "Não foi possível carregar as publicações.",
    });
  }
});

app.post(
  "/api/publicacoes",
  exigirLogin,
  upload.single("arquivo"),
  (req, res) => {
    const arquivoSalvo = req.file ? `/uploads/${req.file.filename}` : "";

    try {
      const titulo = String(req.body.titulo || "").trim();
      const tipo = String(req.body.tipo || "")
        .trim()
        .toLowerCase();
      const dataPublicacao = String(req.body.dataPublicacao || "").trim();
      const dataFinal = String(req.body.dataFinal || "").trim();
      const tempoTela = Number(req.body.tempoTela || 10);
      const descricao = String(req.body.descricao || "").trim();
      const categoria = String(req.body.categoria || "Geral").trim() || "Geral";
      const tipoEvento = String(req.body.tipoEvento || "").trim();
      const dataEvento = String(req.body.dataEvento || "").trim();
      const publico = String(req.body.publico || "").trim();

      const permissaoPorTipo = {
        noticia: "gerenciar_noticias",
        evento: "gerenciar_eventos",
        video: "gerenciar_videos",
      };

      if (!permissaoPorTipo[tipo]) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          erro: "Selecione notícia, evento ou vídeo.",
        });
      }

      const idUsuario = req.session.usuario.id_usuario;

      if (!verificarPermissaoPublicacao(idUsuario, tipo)) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(403).json({
          erro: "Você não tem permissão para publicar este tipo de conteúdo.",
        });
      }

      if (
        !titulo ||
        titulo.length > 250 ||
        !dataPublicacao ||
        !dataFinal ||
        dataFinal < dataPublicacao ||
        !Number.isFinite(tempoTela) ||
        tempoTela < 1
      ) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          erro: "Confira o título, as datas e o tempo de exibição.",
        });
      }

      if (tipo === "noticia" && !descricao) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          erro: "Informe o conteúdo da notícia.",
        });
      }

      if (
        tipo === "evento" &&
        (!tipoEvento ||
          !dataEvento ||
          !descricao ||
          !publico ||
          !req.file ||
          !req.file.mimetype.startsWith("image/"))
      ) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          erro: "Preencha os dados do evento e envie uma imagem.",
        });
      }

      if (
        tipo === "video" &&
        (!req.file || !req.file.mimetype.startsWith("video/"))
      ) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          erro: "Selecione um arquivo de vídeo.",
        });
      }

      const salvar = db.transaction(() => {
        const publicacao = db
          .prepare(`
            INSERT INTO publicacao (
              titulo_public,
              data_public,
              data_fim_public,
              tipo_public,
              tempo_exibicao_public,
              arquivo_public
            )
            VALUES (?, ?, ?, ?, ?, ?)
          `)
          .run(
            titulo,
            dataPublicacao,
            dataFinal,
            tipo,
            tempoTela,
            arquivoSalvo || null,
          );

        const id = Number(publicacao.lastInsertRowid);

        if (tipo === "noticia") {
          db.prepare(`
            INSERT INTO noticia (
              fk_public,
              tempo_exibicao_not,
              categoria_not,
              descricao_not
            )
            VALUES (?, ?, ?, ?)
          `).run(id, tempoTela, categoria, descricao);
        } else if (tipo === "evento") {
          db.prepare(`
            INSERT INTO evento (
              fb_public,
              tipo_evento,
              data_evento,
              poster_imagem_evento,
              descricao_evento,
              publico_evento
            )
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(id, tipoEvento, dataEvento, arquivoSalvo, descricao, publico);
        } else {
          db.prepare(`
            INSERT INTO video (
              fp_public,
              duracao_video,
              link_video
            )
            VALUES (?, ?, ?)
          `).run(id, tempoTela, arquivoSalvo);
        }

        return id;
      });

      const id = salvar();

      res.status(201).json({
        mensagem: "Publicação salva no banco de dados.",
        id,
      });
    } catch (erro) {
      console.error(erro);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({
        erro: "Não foi possível salvar a publicação.",
      });
    }
  },
);

app.put("/api/publicacoes/:id", exigirLogin, (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        erro: "Publicação inválida.",
      });
    }

    const existente = db
      .prepare(`
        SELECT numero_public, tipo_public
        FROM publicacao
        WHERE numero_public = ?
      `)
      .get(id);

    if (!existente) {
      return res.status(404).json({
        erro: "Publicação não encontrada.",
      });
    }

    const tipo = String(existente.tipo_public || "noticia").toLowerCase();

    if (!verificarPermissaoPublicacao(req.session.usuario.id_usuario, tipo)) {
      return res.status(403).json({
        erro: "Você não tem permissão para editar esta publicação.",
      });
    }

    const titulo = String(req.body.titulo || "").trim();
    const dataPublicacao = String(req.body.dataPublicacao || "").trim();
    const dataFinal = String(req.body.dataFinal || "").trim();
    const tempoTela = Number(req.body.tempoTela);
    const descricao = String(req.body.descricao || "").trim();
    const categoria = String(req.body.categoria || "Geral").trim() || "Geral";
    const tipoEvento = String(req.body.tipoEvento || "").trim();
    const dataEvento = String(req.body.dataEvento || "").trim();
    const publico = String(req.body.publico || "").trim();

    const dataValida = (valor) =>
      /^\d{4}-\d{2}-\d{2}$/.test(valor) &&
      !Number.isNaN(Date.parse(`${valor}T00:00:00`));

    if (
      !titulo ||
      titulo.length > 250 ||
      !dataValida(dataPublicacao) ||
      !dataValida(dataFinal) ||
      dataFinal < dataPublicacao ||
      !Number.isFinite(tempoTela) ||
      tempoTela < 1 ||
      tempoTela > 86400
    ) {
      return res.status(400).json({
        erro: "Confira o título, as datas e o tempo de exibição.",
      });
    }

    if (tipo === "noticia" && !descricao) {
      return res.status(400).json({
        erro: "Informe o conteúdo da notícia.",
      });
    }

    if (
      tipo === "evento" &&
      (!tipoEvento || !dataValida(dataEvento) || !descricao || !publico)
    ) {
      return res.status(400).json({
        erro: "Preencha o tipo, a data, a descrição e o público do evento.",
      });
    }

    const atualizar = db.transaction(() => {
      db.prepare(`
        UPDATE publicacao
        SET
          titulo_public = ?,
          data_public = ?,
          data_fim_public = ?,
          tempo_exibicao_public = ?
        WHERE numero_public = ?
      `).run(titulo, dataPublicacao, dataFinal, tempoTela, id);

      if (tipo === "noticia") {
        db.prepare(`
          UPDATE noticia
          SET
            tempo_exibicao_not = ?,
            categoria_not = ?,
            descricao_not = ?
          WHERE fk_public = ?
        `).run(tempoTela, categoria, descricao, id);
      } else if (tipo === "evento") {
        db.prepare(`
          UPDATE evento
          SET
            tipo_evento = ?,
            data_evento = ?,
            descricao_evento = ?,
            publico_evento = ?
          WHERE fb_public = ?
        `).run(tipoEvento, dataEvento, descricao, publico, id);
      } else if (tipo === "video") {
        db.prepare(`
          UPDATE video
          SET duracao_video = ?
          WHERE fp_public = ?
        `).run(tempoTela, id);
      }
    });

    atualizar();

    res.json({
      mensagem: "Publicação atualizada com sucesso.",
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      erro: "Não foi possível atualizar a publicação.",
    });
  }
});

app.delete("/api/publicacoes/:id", exigirLogin, (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        erro: "Publicação inválida.",
      });
    }

    const item = db
      .prepare(`
        SELECT
          COALESCE(
            p.tipo_public,
            CASE
              WHEN n.fk_public IS NOT NULL THEN 'noticia'
              WHEN e.fb_public IS NOT NULL THEN 'evento'
              WHEN v.fp_public IS NOT NULL THEN 'video'
            END
          ) AS tipo_public,
          COALESCE(
            p.arquivo_public,
            e.poster_imagem_evento,
            v.link_video
          ) AS arquivo_public
        FROM publicacao p
        LEFT JOIN noticia n
          ON n.fk_public = p.numero_public
        LEFT JOIN evento e
          ON e.fb_public = p.numero_public
        LEFT JOIN video v
          ON v.fp_public = p.numero_public
        WHERE p.numero_public = ?
      `)
      .get(id);

    if (!item) {
      return res.status(404).json({
        erro: "Publicação não encontrada.",
      });
    }

    if (
      !verificarPermissaoPublicacao(
        req.session.usuario.id_usuario,
        item.tipo_public,
      )
    ) {
      return res.status(403).json({
        erro: "Você não tem permissão para excluir esta publicação.",
      });
    }

    const excluir = db.transaction(() => {
      db.prepare("DELETE FROM noticia WHERE fk_public = ?").run(id);
      db.prepare("DELETE FROM evento WHERE fb_public = ?").run(id);
      db.prepare("DELETE FROM video WHERE fp_public = ?").run(id);
      db.prepare("DELETE FROM publicacao WHERE numero_public = ?").run(id);
    });

    excluir();

    if (item.arquivo_public) {
      const nomeArquivo = path.basename(item.arquivo_public);
      const caminho = path.join(pastaUploads, nomeArquivo);

      if (fs.existsSync(caminho)) {
        fs.unlinkSync(caminho);
      }
    }

    res.json({
      mensagem: "Publicação excluída.",
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      erro: "Não foi possível excluir a publicação.",
    });
  }
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

app.get("*", (req, res) => {
  res.sendFile(path.join(pastaRaizProjeto, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Mural Digital IFTO rodando em http://localhost:${PORT}`);
});