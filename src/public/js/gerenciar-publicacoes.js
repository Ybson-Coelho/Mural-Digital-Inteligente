const selectFiltro = document.getElementById("type");
const inputBusca = document.getElementById("search");
const btnBusca = document.getElementById("btn-search");
const listaPublicacoes = document.getElementById("publicacoes-list");
let publicacoes = [];
let timeoutSucesso;

const tipos = {
  noticia: { id: 1, nome: "Notícia" },
  evento: { id: 2, nome: "Evento" },
  video: { id: 3, nome: "Vídeo" },
};

function formatarData(data) {
  if (!data) return "—";
  const partes = String(data).split("-");
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : data;
}

function escaparHTML(valor) {
  return String(valor ?? "").replace(
    /[&<>"']/g,
    (caractere) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[caractere],
  );
}

function textoSemHTML(valor) {
  const documento = new DOMParser().parseFromString(
    String(valor ?? ""),
    "text/html",
  );
  return documento.body.textContent || "";
}

async function carregarPublicacoes(type = 0, busca = "") {
  if (!listaPublicacoes) return;
  listaPublicacoes.innerHTML =
    "<p class='sem-publicacoes'>Carregando publicações...</p>";

  try {
    const resposta = await fetch("/api/publicacoes", {
      credentials: "same-origin",
    });
    const resultado = await resposta.json();
    if (!resposta.ok)
      throw new Error(
        resultado.erro || "Não foi possível carregar as publicações.",
      );
    publicacoes = Array.isArray(resultado) ? resultado : [];

    const termo = busca.toLowerCase().trim();
    const filtradas = publicacoes.filter((publicacao) => {
      const tipoId = tipos[publicacao.tipo]?.id || 0;
      return (
        (type === 0 || tipoId === type) &&
        String(publicacao.titulo || "")
          .toLowerCase()
          .includes(termo)
      );
    });

    listaPublicacoes.innerHTML = "";
    if (!filtradas.length) {
      listaPublicacoes.innerHTML = `<div class="sem-publicacoes"><h3>Nenhuma publicação encontrada</h3><p>Não encontramos publicações com os filtros informados.</p></div>`;
      return;
    }

    filtradas.forEach((publicacao) => {
      const item = document.createElement("div");
      item.className = "publicacao-item";
      item.dataset.id = publicacao.id;

      const titulo = document.createElement("span");
      titulo.className = "publicacao-titulo";
      titulo.textContent = publicacao.titulo;

      const tipo = document.createElement("span");
      tipo.className = "publicacao-tipo";
      tipo.textContent = tipos[publicacao.tipo]?.nome || publicacao.tipo;

      const data = document.createElement("span");
      data.className = "publicacao-data";
      data.textContent = formatarData(publicacao.data);

      const acoes = document.createElement("div");
      acoes.className = "publicacao-acoes";

      const editar = document.createElement("button");
      editar.type = "button";
      editar.className = "btn btn-primary btn-editar";
      editar.dataset.id = publicacao.id;
      editar.title = "Editar";
      editar.setAttribute(
        "aria-label",
        `Editar publicação: ${publicacao.titulo}`,
      );
      editar.innerHTML = '<i data-lucide="edit"></i>';

      const excluir = document.createElement("button");
      excluir.type = "button";
      excluir.className = "btn btn-danger btn-excluir";
      excluir.dataset.id = publicacao.id;
      excluir.title = "Excluir";
      excluir.setAttribute(
        "aria-label",
        `Excluir publicação: ${publicacao.titulo}`,
      );
      excluir.innerHTML = '<i data-lucide="trash-2"></i>';

      acoes.append(editar, excluir);
      item.append(titulo, tipo, data, acoes);
      listaPublicacoes.appendChild(item);
    });

    if (
      typeof lucide !== "undefined" &&
      typeof lucide.createIcons === "function"
    )
      lucide.createIcons();
  } catch (erro) {
    listaPublicacoes.innerHTML = "";
    const aviso = document.createElement("p");
    aviso.className = "sem-publicacoes";
    aviso.textContent =
      erro.message || "Ocorreu um erro ao carregar as publicações.";
    listaPublicacoes.appendChild(aviso);
  }
}

function mostrarToastSucesso(mensagem) {
  clearTimeout(timeoutSucesso);
  document.querySelector(".toast-sucesso")?.remove();
  const toast = document.createElement("div");
  toast.className = "toast-sucesso";
  toast.setAttribute("role", "status");
  toast.innerHTML = `<i data-lucide="check-circle"></i><span>${escaparHTML(mensagem)}</span>`;
  document.body.appendChild(toast);
  if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function")
    lucide.createIcons();
  timeoutSucesso = setTimeout(() => toast.remove(), 3000);
}

function mostrarToastErro(mensagem) {
  document.querySelector(".toast-erro")?.remove();
  const toast = document.createElement("div");
  toast.className = "toast-erro";
  toast.setAttribute("role", "alert");
  toast.textContent = mensagem;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function criarCampo(rotulo, nome, valor = "", tipo = "text", opcoes = {}) {
  const grupo = document.createElement("div");
  grupo.className = "campo-edicao";
  const label = document.createElement("label");
  label.htmlFor = `editar-${nome}`;
  label.textContent = rotulo;
  const campo =
    tipo === "textarea"
      ? document.createElement("textarea")
      : document.createElement("input");
  campo.id = `editar-${nome}`;
  campo.name = nome;
  if (tipo !== "textarea") campo.type = tipo;
  campo.value = valor ?? "";
  if (opcoes.min) campo.min = opcoes.min;
  if (opcoes.required !== false) campo.required = true;
  if (opcoes.maxLength) campo.maxLength = opcoes.maxLength;
  grupo.append(label, campo);
  return { grupo, campo };
}

function fecharModal(modal) {
  modal?.remove();
  document.body.classList.remove("modal-publicacao-aberto");
}

function abrirEdicao(publicacao) {
  if (!publicacao) return;
  document.querySelector(".modal-edicao-publicacao")?.remove();

  const modal = document.createElement("div");
  modal.className = "modal-edicao-publicacao";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "titulo-modal-edicao");

  const painel = document.createElement("form");
  painel.className = "modal-edicao-painel";
  painel.noValidate = false;
  painel.innerHTML = `<div class="modal-edicao-cabecalho"><h2 id="titulo-modal-edicao">Editar publicação</h2><button type="button" class="modal-fechar" aria-label="Fechar">×</button></div><p class="modal-edicao-tipo">Tipo: ${escaparHTML(tipos[publicacao.tipo]?.nome || publicacao.tipo)}</p><div class="campos-edicao"></div><div class="modal-edicao-acoes"><button type="button" class="btn btn-secondary btn-cancelar-edicao">Cancelar</button><button type="submit" class="btn btn-primary btn-salvar-edicao">Salvar alterações</button></div>`;

  const campos = painel.querySelector(".campos-edicao");
  const titulo = criarCampo("Título", "titulo", publicacao.titulo, "text", {
    maxLength: 250,
  });
  const data = criarCampo(
    "Data da publicação",
    "data",
    publicacao.data,
    "date",
  );
  const dataFinal = criarCampo(
    "Data final da publicação",
    "dataFinal",
    publicacao.dataFinal,
    "date",
  );
  const tempo = criarCampo(
    "Tempo de exibição (segundos)",
    "tempoTela",
    publicacao.tempoTela || 10,
    "number",
    { min: 1 },
  );
  campos.append(titulo.grupo, data.grupo, dataFinal.grupo, tempo.grupo);

  const descricao = criarCampo(
    "Descrição / conteúdo",
    "descricao",
    textoSemHTML(publicacao.descricao),
    "textarea",
  );
  descricao.campo.rows = 6;
  descricao.campo.required = publicacao.tipo !== "video";
  campos.appendChild(descricao.grupo);

  if (publicacao.tipo === "noticia") {
    const categoria = criarCampo(
      "Categoria",
      "categoria",
      publicacao.categoria || "Geral",
    );
    campos.appendChild(categoria.grupo);
  }
  if (publicacao.tipo === "evento") {
    const tipoEvento = criarCampo(
      "Tipo do evento",
      "tipoEvento",
      publicacao.tipoEvento || "",
    );
    const dataEvento = criarCampo(
      "Data do evento",
      "dataEvento",
      publicacao.dataEvento || "",
      "date",
    );
    const publico = criarCampo("Público", "publico", publicacao.publico || "");
    campos.append(tipoEvento.grupo, dataEvento.grupo, publico.grupo);
  }

  document.body.appendChild(modal);
  modal.appendChild(painel);
  document.body.classList.add("modal-publicacao-aberto");
  titulo.campo.focus();

  const fechar = () => fecharModal(modal);
  painel.querySelector(".modal-fechar").addEventListener("click", fechar);
  painel
    .querySelector(".btn-cancelar-edicao")
    .addEventListener("click", fechar);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) fechar();
  });
  modal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") fechar();
  });

  data.campo.addEventListener("change", () => {
    if (data.campo.value) dataFinal.campo.min = data.campo.value;
    if (dataFinal.campo.value && dataFinal.campo.value < data.campo.value)
      dataFinal.campo.value = data.campo.value;
  });

  painel.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!painel.reportValidity()) return;
    if (dataFinal.campo.value < data.campo.value) {
      mostrarToastErro(
        "A data final não pode ser anterior à data de publicação.",
      );
      return;
    }
    if (Number(tempo.campo.value) < 1) {
      mostrarToastErro("O tempo de exibição deve ser de pelo menos 1 segundo.");
      return;
    }

    const botaoSalvar = painel.querySelector(".btn-salvar-edicao");
    botaoSalvar.disabled = true;
    botaoSalvar.textContent = "Salvando...";
    const dados = {
      titulo: titulo.campo.value.trim(),
      dataPublicacao: data.campo.value,
      dataFinal: dataFinal.campo.value,
      tempoTela: Number(tempo.campo.value),
      descricao: descricao.campo.value.trim(),
    };
    if (publicacao.tipo === "noticia")
      dados.categoria = painel.elements.categoria.value.trim();
    if (publicacao.tipo === "evento") {
      dados.tipoEvento = painel.elements.tipoEvento.value.trim();
      dados.dataEvento = painel.elements.dataEvento.value;
      dados.publico = painel.elements.publico.value.trim();
    }

    try {
      const resposta = await fetch(`/api/publicacoes/${publicacao.id}`, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });
      const resultado = await resposta.json();
      if (!resposta.ok)
        throw new Error(
          resultado.erro || "Não foi possível atualizar a publicação.",
        );
      fechar();
      mostrarToastSucesso("Publicação atualizada com sucesso!");
      await executarBusca();
    } catch (erro) {
      mostrarToastErro(
        erro.message || "Não foi possível atualizar a publicação.",
      );
    } finally {
      botaoSalvar.disabled = false;
      botaoSalvar.textContent = "Salvar alterações";
    }
  });
}

function abrirConfirmacaoExclusao(publicacao) {
  if (!publicacao) return;
  document.querySelector(".toast-confirmacao")?.remove();
  const toast = document.createElement("div");
  toast.className = "toast-confirmacao";
  toast.setAttribute("role", "dialog");
  toast.setAttribute("aria-modal", "true");
  toast.innerHTML = `<strong>Excluir publicação?</strong><p>Tem certeza que deseja apagar “${escaparHTML(publicacao.titulo)}”?</p><div class="toast-acoes"><button type="button" class="btn btn-secondary" id="btn-cancelar-exclusao">Cancelar</button><button type="button" class="btn btn-danger" id="btn-confirmar-exclusao">Excluir</button></div>`;
  document.body.appendChild(toast);
  const cancelar = toast.querySelector("#btn-cancelar-exclusao");
  const confirmar = toast.querySelector("#btn-confirmar-exclusao");
  cancelar.focus();
  cancelar.addEventListener("click", () => toast.remove());
  confirmar.addEventListener("click", async () => {
    confirmar.disabled = true;
    confirmar.textContent = "Excluindo...";
    try {
      const resposta = await fetch(`/api/publicacoes/${publicacao.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const resultado = await resposta.json();
      if (!resposta.ok)
        throw new Error(
          resultado.erro || "Não foi possível excluir a publicação.",
        );
      toast.remove();
      mostrarToastSucesso("Publicação excluída com sucesso!");
      await executarBusca();
    } catch (erro) {
      toast.remove();
      mostrarToastErro(
        erro.message || "Não foi possível excluir a publicação.",
      );
    }
  });
}

async function executarBusca() {
  await carregarPublicacoes(
    selectFiltro ? Number(selectFiltro.value) : 0,
    inputBusca ? inputBusca.value : "",
  );
}

listaPublicacoes?.addEventListener("click", (event) => {
  const botaoEditar = event.target.closest(".btn-editar");
  if (botaoEditar) {
    abrirEdicao(
      publicacoes.find((item) => item.id === Number(botaoEditar.dataset.id)),
    );
    return;
  }
  const botaoExcluir = event.target.closest(".btn-excluir");
  if (botaoExcluir)
    abrirConfirmacaoExclusao(
      publicacoes.find((item) => item.id === Number(botaoExcluir.dataset.id)),
    );
});

btnBusca?.addEventListener("click", executarBusca);
inputBusca?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    executarBusca();
  }
});
selectFiltro?.addEventListener("change", executarBusca);
document.addEventListener("DOMContentLoaded", () => carregarPublicacoes());
