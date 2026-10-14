let publicacoes = [
  {
    titulo: "Publicação 1",
    data: "01/07/2026",
    tipo: "Notícia",
    tipo_id: 1,
  },
  {
    titulo: "Publicação 2",
    data: "02/07/2026",
    tipo: "Evento",
    tipo_id: 2,
  },
  {
    titulo: "Publicação 3",
    data: "03/07/2026",
    tipo: "Vídeo",
    tipo_id: 3,
  },
  {
    titulo: "Publicação 4",
    data: "04/07/2026",
    tipo: "Vídeo",
    tipo_id: 3,
  },
  {
    titulo: "Publicação 5",
    data: "05/07/2026",
    tipo: "Notícia",
    tipo_id: 1,
  },
];

const selectFiltro = document.getElementById("type");
const inputBusca = document.getElementById("search");
const btnBusca = document.getElementById("btn-search");
const listaPublicacoes = document.getElementById("publicacoes-list");

let timeoutSucesso;

function carregarPublicacoes(type = 0, busca = "") {
  if (!listaPublicacoes) return;

  listaPublicacoes.innerHTML = "";
  const termo = busca.toLowerCase().trim();

  const publicacoesFiltradas = publicacoes.filter((publicacao) => {
    const correspondeTipo = type === 0 || publicacao.tipo_id === type;
    const correspondeBusca = publicacao.titulo.toLowerCase().includes(termo);

    return correspondeTipo && correspondeBusca;
  });

  if (publicacoesFiltradas.length === 0) {
    listaPublicacoes.innerHTML = `
      <div class="sem-publicacoes">
        <h3>Nenhuma publicação encontrada</h3>
        <p>Não encontramos nenhuma publicação com os filtros informados.</p>
      </div>
    `;
    return;
  }

  publicacoesFiltradas.forEach((publicacao) => {
    const index = publicacoes.indexOf(publicacao);

    const item = document.createElement("div");
    item.className = "publicacao-item";
    item.dataset.index = index;

    item.innerHTML = `
      <span class="publicacao-titulo">${publicacao.titulo}</span>
      <span class="publicacao-tipo">${publicacao.tipo}</span>
      <span class="publicacao-data">${publicacao.data}</span>
      <div class="publicacao-acoes">
        <button
          type="button"
          class="btn btn-primary"
          title="Editar"
          aria-label="Editar publicação: ${publicacao.titulo}"
        >
          <i data-lucide="edit"></i>
        </button>
        <button
          type="button"
          class="btn btn-danger btn-excluir"
          data-index="${index}"
          title="Excluir"
          aria-label="Excluir publicação: ${publicacao.titulo}"
        >
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `;

    listaPublicacoes.appendChild(item);
  });

  if (
    typeof lucide !== "undefined" &&
    typeof lucide.createIcons === "function"
  ) {
    lucide.createIcons();
  }
}

function deletarItem(index) {
  const publicacao = publicacoes[index];
  if (!publicacao) return;

  const toastExistente = document.querySelector(".toast-confirmacao");
  if (toastExistente) {
    toastExistente.remove();
  }

  const toast = document.createElement("div");
  toast.className = "toast-confirmacao";
  toast.setAttribute("role", "dialog");
  toast.setAttribute("aria-modal", "true");

  toast.innerHTML = `
    <strong>Excluir publicação?</strong>
    <p>Tem certeza que deseja apagar "${publicacao.titulo}"?</p>
    <div class="toast-acoes">
      <button type="button" class="btn btn-secondary" id="btn-cancelar-exclusao">
        Cancelar
      </button>
      <button type="button" class="btn btn-danger" id="btn-confirmar-exclusao">
        Excluir
      </button>
    </div>
  `;

  document.body.appendChild(toast);

  const btnCancelar = document.getElementById("btn-cancelar-exclusao");
  const btnConfirmar = document.getElementById("btn-confirmar-exclusao");

  btnCancelar.focus();

  btnCancelar.addEventListener("click", () => {
    toast.remove();
  });

  btnConfirmar.addEventListener("click", () => {
    publicacoes.splice(index, 1);
    toast.remove();
    executarBusca();
    mostrarToastSucesso("Publicação excluída com sucesso!");
  });
}

function mostrarToastSucesso(mensagem) {
  clearTimeout(timeoutSucesso);

  const toastExistente = document.querySelector(".toast-sucesso");
  if (toastExistente) {
    toastExistente.remove();
  }

  const toast = document.createElement("div");
  toast.className = "toast-sucesso";
  toast.setAttribute("role", "status");

  toast.innerHTML = `
    <i data-lucide="check-circle"></i>
    <span>${mensagem}</span>
  `;

  document.body.appendChild(toast);

  if (
    typeof lucide !== "undefined" &&
    typeof lucide.createIcons === "function"
  ) {
    lucide.createIcons();
  }

  timeoutSucesso = setTimeout(() => {
    toast.remove();
  }, 3000);
}

function executarBusca() {
  const busca = inputBusca ? inputBusca.value : "";
  const tipo = selectFiltro ? Number(selectFiltro.value) : 0;

  carregarPublicacoes(tipo, busca);
}

if (listaPublicacoes) {
  listaPublicacoes.addEventListener("click", (e) => {
    const btnExcluir = e.target.closest(".btn-excluir");
    if (btnExcluir) {
      const index = Number(btnExcluir.dataset.index);
      deletarItem(index);
    }
  });
}

if (btnBusca) {
  btnBusca.addEventListener("click", executarBusca);
}

if (inputBusca) {
  inputBusca.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      executarBusca();
    }
  });
}

if (selectFiltro) {
  selectFiltro.addEventListener("change", executarBusca);
}

document.addEventListener("DOMContentLoaded", () => {
  carregarPublicacoes(0, "");
});
