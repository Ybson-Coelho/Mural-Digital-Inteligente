const path = require("path");
const fs = require("fs");
const db = require("../db/database");
const { verificarPermissaoPublicacao } = require("../middlewares/auth");
const { pastaUploads } = require("../config/upload");

const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp"];
const LIMITE_IMAGEM = 5 * 1024 * 1024;

function ehImagem(arquivo) {
  return Boolean(arquivo) && TIPOS_IMAGEM.includes(arquivo.mimetype);
}

function validarImagem(arquivo) {
  if (!arquivo) return "";

  if (!ehImagem(arquivo)) {
    return "Envie uma imagem jpg, png ou webp.";
  }

  if (arquivo.size > LIMITE_IMAGEM) {
    return "A imagem deve ter no máximo 5 MB.";
  }

  return "";
}

function removerArquivo(arquivo) {
  if (arquivo && fs.existsSync(arquivo.path)) {
    fs.unlinkSync(arquivo.path);
  }
}

function removerImagemAntiga(caminhoAntigo, caminhoNovo) {
  if (!caminhoAntigo || caminhoAntigo === caminhoNovo) return;

  const nomeArquivo = path.basename(caminhoAntigo);
  const caminho = path.join(pastaUploads, nomeArquivo);

  if (fs.existsSync(caminho)) {
    fs.unlinkSync(caminho);
  }
}

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

function listarPublicacoes(req, res) {
  try {
    res.json(obterPublicacoes());
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      erro: "Não foi possível carregar as publicações.",
    });
  }
}

function criarPublicacao(req, res) {
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
      removerArquivo(req.file);
      return res.status(400).json({
        erro: "Selecione notícia, evento ou vídeo.",
      });
    }

    const idUsuario = req.session.usuario.id_usuario;

    if (!verificarPermissaoPublicacao(idUsuario, tipo)) {
      removerArquivo(req.file);
      return res.status(403).json({
        erro: "Você não tem permissão para publicar este tipo de conteúdo.",
      });
    }

    if (tipo !== "video") {
      const erroImagem = validarImagem(req.file);

      if (erroImagem) {
        removerArquivo(req.file);
        return res.status(400).json({ erro: erroImagem });
      }
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
      removerArquivo(req.file);
      return res.status(400).json({
        erro: "Confira o título, as datas e o tempo de exibição.",
      });
    }

    if (tipo === "noticia" && !descricao) {
      removerArquivo(req.file);
      return res.status(400).json({
        erro: "Informe o conteúdo da notícia.",
      });
    }

    if (
      tipo === "evento" &&
      (!tipoEvento || !dataEvento || !descricao || !publico)
    ) {
      removerArquivo(req.file);
      return res.status(400).json({
        erro: "Preencha os dados do evento.",
      });
    }

    if (
      tipo === "video" &&
      (!req.file || !req.file.mimetype.startsWith("video/"))
    ) {
      removerArquivo(req.file);
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
        `).run(
          id,
          tipoEvento,
          dataEvento,
          arquivoSalvo || "",
          descricao,
          publico,
        );
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
      imagem: arquivoSalvo,
    });
  } catch (erro) {
    console.error(erro);
    removerArquivo(req.file);
    res.status(500).json({
      erro: "Não foi possível salvar a publicação.",
    });
  }
}

function atualizarPublicacao(req, res) {
  const responderErro = (status, mensagem) => {
    removerArquivo(req.file);
    return res.status(status).json({
      erro: mensagem,
    });
  };

  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return responderErro(400, "Publicação inválida.");
    }

    const existente = db
      .prepare(`
        SELECT
          p.numero_public,
          p.tipo_public,
          p.arquivo_public,
          e.poster_imagem_evento
        FROM publicacao p
        LEFT JOIN evento e
          ON e.fb_public = p.numero_public
        WHERE p.numero_public = ?
      `)
      .get(id);

    if (!existente) {
      return responderErro(404, "Publicação não encontrada.");
    }

    const tipo = String(existente.tipo_public || "noticia").toLowerCase();

    if (!verificarPermissaoPublicacao(req.session.usuario.id_usuario, tipo)) {
      return responderErro(
        403,
        "Você não tem permissão para editar esta publicação.",
      );
    }

    if (req.file && tipo === "video") {
      return responderErro(400, "Esta publicação não aceita imagem.");
    }

    const erroImagem = validarImagem(req.file);

    if (erroImagem) {
      return responderErro(400, erroImagem);
    }

    const arquivoSalvo = req.file ? `/uploads/${req.file.filename}` : "";

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
      return responderErro(
        400,
        "Confira o título, as datas e o tempo de exibição.",
      );
    }

    if (tipo === "noticia" && !descricao) {
      return responderErro(400, "Informe o conteúdo da notícia.");
    }

    if (
      tipo === "evento" &&
      (!tipoEvento || !dataValida(dataEvento) || !descricao || !publico)
    ) {
      return responderErro(
        400,
        "Preencha o tipo, a data, a descrição e o público do evento.",
      );
    }

    const imagemAtual = existente.arquivo_public || "";
    const imagemFinal = arquivoSalvo || imagemAtual;
    const posterAtual = existente.poster_imagem_evento || "";
    const posterFinal = arquivoSalvo || posterAtual;

    const atualizar = db.transaction(() => {
      db.prepare(`
        UPDATE publicacao
        SET
          titulo_public = ?,
          data_public = ?,
          data_fim_public = ?,
          tempo_exibicao_public = ?,
          arquivo_public = ?
        WHERE numero_public = ?
      `).run(
        titulo,
        dataPublicacao,
        dataFinal,
        tempoTela,
        imagemFinal || null,
        id,
      );

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
            poster_imagem_evento = ?,
            descricao_evento = ?,
            publico_evento = ?
          WHERE fb_public = ?
        `).run(
          tipoEvento,
          dataEvento,
          posterFinal,
          descricao,
          publico,
          id,
        );
      } else if (tipo === "video") {
        db.prepare(`
          UPDATE video
          SET duracao_video = ?
          WHERE fp_public = ?
        `).run(tempoTela, id);
      }
    });

    atualizar();

    if (arquivoSalvo) {
      removerImagemAntiga(existente.arquivo_public, arquivoSalvo);
      removerImagemAntiga(existente.poster_imagem_evento, arquivoSalvo);
    }

    res.json({
      mensagem: "Publicação atualizada com sucesso.",
      imagem: arquivoSalvo || imagemAtual,
    });
  } catch (erro) {
    console.error(erro);
    removerArquivo(req.file);
    res.status(500).json({
      erro: "Não foi possível atualizar a publicação.",
    });
  }
}

function excluirPublicacao(req, res) {
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
}

module.exports = {
  listarPublicacoes,
  criarPublicacao,
  atualizarPublicacao,
  excluirPublicacao,
};
