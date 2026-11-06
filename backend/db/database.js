const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const { emailValido } = require("../config/email");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const pastaDados = path.join(__dirname, "..", "..", "dados");
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

if (!colunasUsuario.includes("precisa_trocar_senha")) {
  db.exec(
    "ALTER TABLE usuario ADD COLUMN precisa_trocar_senha INTEGER NOT NULL DEFAULT 0",
  );
}

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS usuario_matricula_unica
  ON usuario(matricula_usuario)
  WHERE matricula_usuario IS NOT NULL
`);

const permissoesIniciais = [
  ["gerenciar_usuarios", "Criar usuários e definir permissões"],
  ["gerenciar_noticias", "Criar e administrar notícias"],
  ["gerenciar_eventos", "Criar e administrar eventos"],
  ["gerenciar_videos", "Adicionar e administrar vídeos"],
  ["visualizar_painel", "Acessar o painel administrativo"],
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

if (adminSenha.length >= 8 && emailValido(adminEmail) && adminMatricula) {
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

module.exports = db;

