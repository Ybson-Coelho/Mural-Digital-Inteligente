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
    tipo: "Artigo",
    tipo_id: 3,
  },
  {
    titulo: "Publicação 4",
    data: "04/07/2026",
    tipo: "Artigo",
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

function carregarPublicacoes(type = 0, busca = "") {
  const listaPublicacoes = document.getElementById("publicacoes-list");

  listaPublicacoes.innerHTML = "";

  busca = busca.toLowerCase().trim();

  const publicacoesFiltradas = publicacoes.filter((publicacao) => {
    const correspondeTipo = type == 0 || publicacao.tipo_id == type;

    const correspondeBusca = publicacao.titulo.toLowerCase().includes(busca);

    return correspondeTipo && correspondeBusca;
  });

  if (publicacoesFiltradas.length === 0) {
    listaPublicacoes.innerHTML = `
      <div class="sem-publicacoes">
        <h3>Nenhuma publicação encontrada</h3>
        <p>
          Não encontramos nenhuma publicação com os filtros informados.
        </p>
      </div>
    `;

    return;
  }

  publicacoesFiltradas.forEach((publicacao) => {
    const index = publicacoes.indexOf(publicacao);

    const publicacaoItem = document.createElement("div");
    publicacaoItem.classList.add("publicacao-item");
    publicacaoItem.setAttribute("data-index", index);

    publicacaoItem.innerHTML = `
      <h3 class="publicacao-titulo">
        ${publicacao.titulo}
      </h3>

      <span class="publicacao-tipo">
        ${publicacao.tipo}
      </span>

      <span class="publicacao-data">
        ${publicacao.data}
      </span>
    `;

    const acoesDiv = document.createElement("div");
    acoesDiv.classList.add("publicacao-acoes");

    acoesDiv.innerHTML = `
      <button class="btn btn-primary">
        <i data-lucide="edit"></i>
      </button>

      <button
        class="btn btn-danger"
        onclick="deletarItem(${index})"
      >
        <i data-lucide="trash-2"></i>
      </button>
    `;

    publicacaoItem.appendChild(acoesDiv);
    listaPublicacoes.appendChild(publicacaoItem);
  });

  lucide.createIcons();
}

function deletarItem(index) {
  const publicacao = publicacoes[index];

  const toastExistente = document.querySelector(".toast-confirmacao");

  if (toastExistente) {
    toastExistente.remove();
  }

  const toast = document.createElement("div");
  toast.classList.add("toast-confirmacao");

  toast.innerHTML = `
    <strong>Excluir publicação?</strong>

    <p>
      Tem certeza que deseja apagar "${publicacao.titulo}"?
    </p>

    <div class="toast-acoes">
      <button class="btn btn-secondary" id="btn-cancelar-exclusao">
        Cancelar
      </button>

      <button class="btn btn-danger" id="btn-confirmar-exclusao">
        Excluir
      </button>
    </div>
  `;

  document.body.appendChild(toast);

  document
    .getElementById("btn-cancelar-exclusao")
    .addEventListener("click", () => {
      toast.remove();
    });

  document
    .getElementById("btn-confirmar-exclusao")
    .addEventListener("click", () => {
      publicacoes.splice(index, 1);

      toast.remove();

      carregarPublicacoes(Number(selectFiltro.value));

      mostrarToastSucesso("Publicação excluída com sucesso!");
    });
}

function mostrarToastSucesso(mensagem) {
  const toastExistente = document.querySelector(".toast-sucesso");

  if (toastExistente) {
    toastExistente.remove();
  }

  const toast = document.createElement("div");
  toast.classList.add("toast-sucesso");

  toast.innerHTML = `
    <i data-lucide="check-circle"></i>
    <span>${mensagem}</span>
  `;

  document.body.appendChild(toast);

  lucide.createIcons();

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

selectFiltro.addEventListener("change", () => {
  const tipoSelecionado = Number(selectFiltro.value);

  carregarPublicacoes(tipoSelecionado);
});

function executarBusca() {
  const busca = inputBusca.value;
  const tipo = Number(selectFiltro.value);

  carregarPublicacoes(tipo, busca);
}

btnBusca.addEventListener("click", executarBusca);

inputBusca.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    executarBusca();
  }
});

selectFiltro.addEventListener("change", () => {
  executarBusca();
});

document.addEventListener("DOMContentLoaded", () => {
  carregarPublicacoes(0, "");
});
