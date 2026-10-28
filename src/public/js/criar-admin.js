const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const email = (process.env.ADMIN_EMAIL || "samuel.souza7@estudante.ifto.edu.br")
  .trim()
  .toLowerCase();
const matricula = (process.env.ADMIN_MATRICULA || "202512940007").trim();
const senha = process.env.ADMIN_SENHA || "";

if (!email || !matricula || senha.length < 8) {
  console.error(
    "Configure ADMIN_EMAIL, ADMIN_MATRICULA e ADMIN_SENHA no arquivo .env. A senha deve ter pelo menos 8 caracteres.",
  );
  process.exit(1);
}

if (
  !/^[^\s@]+@(?:gmail\.com|estudante\.ifto\.edu\.br|ifto\.edu\.br)$/i.test(
    email,
  )
) {
  console.error(
    "Use um Gmail ou e-mail institucional @estudante.ifto.edu.br ou @ifto.edu.br.",
  );
  process.exit(1);
}

const pastaDados = path.join(__dirname, "..", "dados");
const fs = require("fs");
fs.mkdirSync(pastaDados, { recursive: true });
const db = new Database(path.join(pastaDados, "viva_ciencia.sqlite"));

try {
  db.exec(`
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

  const colunas = db
    .prepare("PRAGMA table_info(usuario)")
    .all()
    .map((c) => c.name);
  if (!colunas.includes("matricula_usuario")) {
    db.exec("ALTER TABLE usuario ADD COLUMN matricula_usuario TEXT");
  }
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS usuario_matricula_unica ON usuario(matricula_usuario) WHERE matricula_usuario IS NOT NULL",
  );

  const permissoes = [
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
  const inserirPermissao = db.prepare(
    "INSERT OR IGNORE INTO permissoes (nome_permissoes, descricao_permissoes) VALUES (?, ?)",
  );
  for (const permissao of permissoes) inserirPermissao.run(...permissao);

  const existenteEmail = db
    .prepare("SELECT id_usuario FROM usuario WHERE lower(email_usuario) = ?")
    .get(email);
  const existenteMatricula = db
    .prepare("SELECT id_usuario FROM usuario WHERE matricula_usuario = ?")
    .get(matricula);
  if (
    existenteEmail &&
    existenteMatricula &&
    existenteEmail.id_usuario !== existenteMatricula.id_usuario
  ) {
    throw new Error("O e-mail e a matrícula já pertencem a contas diferentes.");
  }

  const idExistente =
    existenteEmail?.id_usuario || existenteMatricula?.id_usuario;
  const hash = bcrypt.hashSync(senha, 12);
  let idUsuario;
  if (idExistente) {
    db.prepare(
      "UPDATE usuario SET nome_usuario = ?, email_usuario = ?, matricula_usuario = ?, senha_usuario = ? WHERE id_usuario = ?",
    ).run(nome, email, matricula, hash, idExistente);
    idUsuario = idExistente;
  } else {
    const resultado = db
      .prepare(
        "INSERT INTO usuario (nome_usuario, email_usuario, matricula_usuario, senha_usuario) VALUES (?, ?, ?, ?)",
      )
      .run(nome, email, matricula, hash);
    idUsuario = Number(resultado.lastInsertRowid);
  }

  db.prepare("DELETE FROM usuario_permissoes WHERE fk_usuario = ?").run(
    idUsuario,
  );
  const ids = db.prepare("SELECT id_permissoes FROM permissoes").all();
  const vincular = db.prepare(
    "INSERT OR IGNORE INTO usuario_permissoes (fk_usuario, fk_permissoes) VALUES (?, ?)",
  );
  for (const permissao of ids) vincular.run(idUsuario, permissao.id_permissoes);

  console.log("Administrador global configurado com todas as permissões.");
  console.log(`E-mail: ${email}`);
  console.log(`Matrícula: ${matricula}`);
  console.log("Senha: a definida em ADMIN_SENHA no arquivo .env.");
} catch (erro) {
  console.error("Não foi possível configurar o administrador:", erro.message);
  process.exitCode = 1;
} finally {
  db.close();
}
