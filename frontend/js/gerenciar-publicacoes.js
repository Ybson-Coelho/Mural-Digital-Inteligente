const selectFiltro = document.getElementById("type");
const inputBusca = document.getElementById("search");
const btnBusca = document.getElementById("btn-search");
const listaPublicacoes = document.getElementById("publicacoes-list");

const modalPublicacao = document.getElementById("modal-publicacao");
const formPublicacao = document.getElementById("form-publicacao");
const botaoNovaPublicacao = document.getElementById("btn-nova-publicacao");
const tituloModal = document.getElementById("modal-publicacao-titulo");
const tipoModal = document.getElementById("modal-publicacao-tipo");
const grupoTipo = document.getElementById("grupo-tipo");
const selectTipo = document.getElementById("tipo");
const inputTitulo = document.getElementById("titulo");
const inputDataPublicacao = document.getElementById("data-publicacao");
const inputDataFinal = document.getElementById("data-final");
const inputTempo = document.getElementById("tempo-tela");
const inputCategoria = document.getElementById("categoria");
const botaoSalvarPublicacao = document.getElementById("btn-salvar-publicacao");

const editores = {
  noticia: document.getElementById("conteudo"),
  evento: document.getElementById("conteudo-evento"),
};

const blocos = {
  1: document.getElementById("campos-noticia"),
  2: document.getElementById("campos-evento"),
  3: document.getElementById("campos-video"),
};

const camposImagem = {
  noticia: document.getElementById("imagem-noticia"),
  evento: document.getElementById("poster-evento"),
};

const previews = {
  noticia: document.getElementById("preview-noticia"),
  evento: document.getElementById("preview-evento"),
};

let publicacoes = [];
let permissoesUsuario = [];
let publicacaoEmEdicao = null;

const permissaoPorTipo = {
  noticia: "gerenciar_noticias",
  evento: "gerenciar_eventos",
  video: "gerenciar_videos",
};

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

function dataDeHoje() {
  const agora = new Date();
  return new Date(agora.getTime() - agora.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
}

function validarImagem(arquivo) {
  if (!arquivo) return "";

  const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];

  if (!tiposPermitidos.includes(arquivo.type)) {
    return "Envie uma imagem jpg, png ou webp.";
  }

  if (arquivo.size > 5 * 1024 * 1024) {
    return "A imagem deve ter no máximo 5 MB.";
  }

  return "";
}

function podeGerenciar(tipo) {
  return permissoesUsuario.includes(permissaoPorTipo[tipo]);
}

function tipoSelecionado() {
  return (
    { 1: "noticia", 2: "evento", 3: "video" }[selectTipo.value] || ""
  );
}

async function carregarPermissoes() {
  try {
    const resposta = await fetch(`${API_URL}/sessao`, {
      credentials: "include",
    });

    const sessao = await resposta.json();

    permissoesUsuario = sessao.permissoes || [];
  } catch (erro) {
    permissoesUsuario = [];
  }
}

function aplicarPermissoesDeCriacao() {
  const opcoes = [
    { valor: "1", tipo: "noticia" },
    { valor: "2", tipo: "evento" },
    { valor: "3", tipo: "video" },
  ];

  let podeCriarAlgo = false;

  opcoes.forEach(({ valor, tipo }) => {
    const opcao = selectTipo.querySelector(`option[value="${valor}"]`);
    const liberado = podeGerenciar(tipo);

    if (opcao) opcao.disabled = !liberado;
    if (liberado) podeCriarAlgo = true;
  });

  if (!podeCriarAlgo) {
    aplicarCadeado(
      botaoNovaPublicacao,
      "Você não tem permissão para criar publicações.",
    );
  }
}

async function carregarPublicacoes(type = 0, busca = "") {
  if (!listaPublicacoes) return;
  listaPublicacoes.innerHTML =
    "<p class='sem-publicacoes'>Carregando publicações...</p>";

  try {
    const resposta = await fetch(`${API_URL}/publicacoes`, {
      credentials: "include",
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
      listaPublicacoes.appendChild(criarLinhaPublicacao(publicacao));
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

function criarLinhaPublicacao(publicacao) {
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
  editar.setAttribute("aria-label", `Editar publicação: ${publicacao.titulo}`);
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

  if (!podeGerenciar(publicacao.tipo)) {
    aplicarCadeado(
      editar,
      "Você não tem permissão para editar esta publicação.",
    );
    aplicarCadeado(
      excluir,
      "Você não tem permissão para excluir esta publicação.",
    );
  }

  acoes.append(editar, excluir);
  item.append(titulo, tipo, data, acoes);

  return item;
}

function limparPreviews() {
  Object.values(previews).forEach((preview) => {
    if (!preview) return;
    preview.hidden = true;
    preview.removeAttribute("src");
  });
}

function mostrarPreview(tipo, caminho) {
  const preview = previews[tipo];

  if (!preview || !caminho) return;

  prepararImagem(preview, caminho);
  preview.hidden = false;
}

function atualizarCamposDoTipo() {
  const tipo = tipoSelecionado();
  const editandoVideo = Boolean(publicacaoEmEdicao) && tipo === "video";

  Object.entries(blocos).forEach(([valor, bloco]) => {
    if (!bloco) return;

    const liberado = selectTipo.value === valor && !(editandoVideo && valor === "3");

    bloco.hidden = !liberado;
    bloco.disabled = !liberado;

    bloco.querySelectorAll("input, select, textarea").forEach((campo) => {
      campo.disabled = !liberado;
      campo.required =
        liberado &&
        !publicacaoEmEdicao &&
        campo.dataset.opcional !== "true";
    });
  });
}

function abrirModal(publicacao = null) {
  publicacaoEmEdicao = publicacao;

  formPublicacao.reset();
  limparPreviews();

  Object.values(editores).forEach((editor) => {
    if (editor) editor.innerHTML = "";
  });

  selectTipo.disabled = false;
  grupoTipo.hidden = false;
  tipoModal.hidden = true;
  tituloModal.textContent = publicacao
    ? "Editar publicação"
    : "Nova publicação";

  botaoSalvarPublicacao.innerHTML =
    '<i data-lucide="save"></i> Salvar';

  const hoje = dataDeHoje();
  inputDataPublicacao.value = hoje;
  inputDataFinal.min = hoje;
  inputDataFinal.value = hoje;
  inputTempo.value = 10;
  inputCategoria.value = "Geral";

  if (publicacao) {
    preencherFormulario(publicacao);
  }

  modalPublicacao.hidden = false;
  document.body.classList.add("modal-aberto");

  atualizarCamposDoTipo();

  if (
    typeof lucide !== "undefined" &&
    typeof lucide.createIcons === "function"
  )
    lucide.createIcons();

  inputTitulo.focus();
}

function preencherFormulario(publicacao) {
  selectTipo.value = String(tipos[publicacao.tipo]?.id || "");
  selectTipo.disabled = true;
  grupoTipo.hidden = true;
  tipoModal.textContent = `Tipo: ${tipos[publicacao.tipo]?.nome || publicacao.tipo}`;
  tipoModal.hidden = false;

  inputTitulo.value = publicacao.titulo || "";
  inputDataPublicacao.value = publicacao.data || "";
  inputDataFinal.value = publicacao.dataFinal || "";
  inputTempo.value = publicacao.tempoTela || 10;
  inputCategoria.value = publicacao.categoria || "Geral";

  const editor = editores[publicacao.tipo];

  if (editor) {
    editor.innerHTML = publicacao.descricao || "";
  }

  if (publicacao.tipo === "evento") {
    document.getElementById("tipo-evento").value = publicacao.tipoEvento || "";
    document.getElementById("data-evento").value = publicacao.dataEvento || "";
    document.getElementById("publico-evento").value = publicacao.publico || "";
  }

  if (publicacao.tipo !== "video") {
    mostrarPreview(publicacao.tipo, publicacao.imagem);
  }
}

function fecharModal() {
  publicacaoEmEdicao = null;
  modalPublicacao.hidden = true;
  document.body.classList.remove("modal-aberto");
  formPublicacao.reset();
  limparPreviews();
}

function executarComandoEditor(botao) {
  const comando = botao.dataset.comando;
  const editor = botao.closest("fieldset")?.querySelector(".editor-conteudo");

  if (!comando || !editor) return;

  editor.focus();
  document.execCommand(comando, false, null);
}

function montarDados(tipo) {
  const dados = new FormData();
  const editor = editores[tipo];

  dados.append("titulo", inputTitulo.value.trim());
  dados.append("tipo", tipo);
  dados.append("dataPublicacao", inputDataPublicacao.value);
  dados.append("dataFinal", inputDataFinal.value);
  dados.append("tempoTela", inputTempo.value || "10");
  dados.append("descricao", editor ? editor.innerHTML.trim() : "");
  dados.append("categoria", inputCategoria.value.trim() || "Geral");

  if (tipo === "evento") {
    dados.append("tipoEvento", document.getElementById("tipo-evento").value.trim());
    dados.append("dataEvento", document.getElementById("data-evento").value);
    dados.append("publico", document.getElementById("publico-evento").value.trim());
  }

  const arquivo =
    tipo === "video"
      ? document.getElementById("arquivo-video").files[0]
      : camposImagem[tipo]?.files[0];

  if (arquivo) dados.append("arquivo", arquivo);

  return dados;
}

function validarFormulario(tipo) {
  if (!inputTitulo.value.trim()) {
    mostrarToast("Informe o título da publicação.", "aviso");
    return false;
  }

  if (!inputDataPublicacao.value || !inputDataFinal.value) {
    mostrarToast("Informe as datas da publicação.", "aviso");
    return false;
  }

  if (inputDataFinal.value < inputDataPublicacao.value) {
    mostrarToast(
      "A data final não pode ser anterior à data de publicação.",
      "aviso",
    );
    return false;
  }

  if (Number(inputTempo.value) < 1) {
    mostrarToast("O tempo de tela deve ser de pelo menos 1 segundo.", "aviso");
    return false;
  }

  if (tipo !== "video" && !editores[tipo]?.innerText.trim()) {
    mostrarToast("Preencha a descrição do conteúdo.", "aviso");
    editores[tipo]?.focus();
    return false;
  }

  if (tipo === "evento") {
    const tipoEvento = document.getElementById("tipo-evento").value.trim();
    const dataEvento = document.getElementById("data-evento").value;
    const publico = document.getElementById("publico-evento").value.trim();

    if (!tipoEvento || !dataEvento || !publico) {
      mostrarToast("Preencha os dados do evento.", "aviso");
      return false;
    }
  }

  if (tipo === "video" && !publicacaoEmEdicao) {
    const arquivo = document.getElementById("arquivo-video").files[0];

    if (!arquivo) {
      mostrarToast("Selecione o vídeo.", "aviso");
      return false;
    }
  }

  if (tipo !== "video") {
    const erroImagem = validarImagem(camposImagem[tipo]?.files[0]);

    if (erroImagem) {
      mostrarToast(erroImagem, "aviso");
      return false;
    }
  }

  return true;
}

async function salvarPublicacao(evento) {
  evento.preventDefault();

  const tipo = publicacaoEmEdicao
    ? publicacaoEmEdicao.tipo
    : tipoSelecionado();

  if (!tipo) {
    mostrarToast("Selecione o tipo de publicação.", "aviso");
    return;
  }

  if (!validarFormulario(tipo)) return;

  const editando = Boolean(publicacaoEmEdicao);
  const url = editando
    ? `${API_URL}/publicacoes/${publicacaoEmEdicao.id}`
    : `${API_URL}/publicacoes`;

  botaoSalvarPublicacao.disabled = true;
  botaoSalvarPublicacao.textContent = "Salvando...";

  try {
    const resposta = await fetch(url, {
      method: editando ? "PUT" : "POST",
      credentials: "include",
      body: montarDados(tipo),
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        resultado.erro ||
          (editando
            ? "Não foi possível atualizar a publicação."
            : "Não foi possível salvar a publicação."),
      );
    }

    fecharModal();
    mostrarToast(
      editando
        ? "Publicação atualizada com sucesso!"
        : "Publicação criada com sucesso!",
    );
    await executarBusca();
  } catch (erro) {
    mostrarToast(
      erro.message || "Não foi possível salvar a publicação.",
      "erro",
    );
  } finally {
    botaoSalvarPublicacao.disabled = false;
    botaoSalvarPublicacao.innerHTML =
      '<i data-lucide="save"></i> Salvar';

    if (
      typeof lucide !== "undefined" &&
      typeof lucide.createIcons === "function"
    )
      lucide.createIcons();
  }
}

function abrirConfirmacaoExclusao(publicacao) {
  if (!publicacao) return;

  mostrarConfirmacao({
    titulo: "Excluir publicação?",
    mensagem: `Tem certeza que deseja apagar “${publicacao.titulo}”?`,
    aoConfirmar: async () => {
      try {
        const resposta = await fetch(
          `${API_URL}/publicacoes/${publicacao.id}`,
          {
            method: "DELETE",
            credentials: "include",
          },
        );

        const resultado = await resposta.json();

        if (!resposta.ok) {
          throw new Error(
            resultado.erro || "Não foi possível excluir a publicação.",
          );
        }

        mostrarToast("Publicação excluída com sucesso!");
        await executarBusca();
      } catch (erro) {
        mostrarToast(
          erro.message || "Não foi possível excluir a publicação.",
          "erro",
        );
      }
    },
  });
}

async function executarBusca() {
  await carregarPublicacoes(
    selectFiltro ? Number(selectFiltro.value) : 0,
    inputBusca ? inputBusca.value : "",
  );
}

listaPublicacoes?.addEventListener("click", (evento) => {
  const botaoEditar = evento.target.closest(".btn-editar");

  if (botaoEditar) {
    abrirModal(
      publicacoes.find((item) => item.id === Number(botaoEditar.dataset.id)),
    );
    return;
  }

  const botaoExcluir = evento.target.closest(".btn-excluir");

  if (botaoExcluir) {
    abrirConfirmacaoExclusao(
      publicacoes.find((item) => item.id === Number(botaoExcluir.dataset.id)),
    );
  }
});

botaoNovaPublicacao?.addEventListener("click", () => abrirModal());

formPublicacao?.addEventListener("submit", salvarPublicacao);

selectTipo?.addEventListener("change", atualizarCamposDoTipo);

inputDataPublicacao?.addEventListener("change", () => {
  if (!inputDataPublicacao.value) return;

  inputDataFinal.min = inputDataPublicacao.value;

  if (inputDataFinal.value && inputDataFinal.value < inputDataPublicacao.value) {
    inputDataFinal.value = inputDataPublicacao.value;
  }
});

modalPublicacao?.addEventListener("click", (evento) => {
  if (evento.target === modalPublicacao) fecharModal();
});

document.getElementById("btn-fechar-modal")?.addEventListener("click", fecharModal);

document
  .getElementById("btn-cancelar-modal")
  ?.addEventListener("click", fecharModal);

document
  .getElementById("modal-publicacao")
  ?.querySelectorAll(".editor-toolbar button")
  .forEach((botao) => {
    botao.addEventListener("mousedown", (evento) => evento.preventDefault());
    botao.addEventListener("click", () => executarComandoEditor(botao));
  });

Object.entries(camposImagem).forEach(([tipo, campo]) => {
  campo?.addEventListener("change", () => {
    const arquivo = campo.files[0];

    if (arquivo) {
      const preview = previews[tipo];
      preview.src = URL.createObjectURL(arquivo);
      preview.hidden = false;
      return;
    }

    if (publicacaoEmEdicao) {
      mostrarPreview(tipo, publicacaoEmEdicao.imagem);
    } else {
      previews[tipo].hidden = true;
    }
  });
});

document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape" && !modalPublicacao.hidden) {
    fecharModal();
  }
});

btnBusca?.addEventListener("click", executarBusca);

inputBusca?.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter") {
    evento.preventDefault();
    executarBusca();
  }
});

selectFiltro?.addEventListener("change", executarBusca);

document.addEventListener("DOMContentLoaded", async () => {
  await carregarPermissoes();
  aplicarPermissoesDeCriacao();
  await carregarPublicacoes();

  const parametros = new URLSearchParams(window.location.search);
  const pediuNova =
    parametros.get("nova") === "1" ||
    sessionStorage.getItem("abrirNovaPublicacao") === "1";

  sessionStorage.removeItem("abrirNovaPublicacao");

  if (pediuNova) {
    abrirModal();
  }
});
