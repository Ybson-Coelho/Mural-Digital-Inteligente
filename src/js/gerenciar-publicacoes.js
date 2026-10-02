let publicacoes = [
  { titulo: "Publicação 1", data: "01/07/2026", tipo: "Notícia" },
  { titulo: "Publicação 2", data: "02/07/2026", tipo: "Evento" },
  { titulo: "Publicação 3", data: "03/07/2026", tipo: "Artigo" },
  { titulo: "Publicação 4", data: "04/07/2026", tipo: "Artigo" },
  { titulo: "Publicação 5", data: "05/07/2026", tipo: "Notícia" },
];

function carregarPublicacoes() {
  const listaPublicacoes = document.getElementById("publicacoes-list");

  listaPublicacoes.innerHTML = "";

  if (publicacoes.length === 0) {
    listaPublicacoes.innerHTML = `
      <div class="sem-publicacoes">
        <h3>Nenhuma publicação encontrada</h3>
        <p>Não há publicações cadastradas no momento.</p>
      </div>
    `;
    return;
  }

  publicacoes.forEach((publicacao, index) => {
    const publicacaoItem = document.createElement("div");
    publicacaoItem.classList.add("publicacao-item");

    publicacaoItem.innerHTML = `
      <h3>${publicacao.titulo}</h3>
      <span class="publicacao-tipo">${publicacao.tipo}</span>
      <span class="publicacao-data">${publicacao.data}</span>
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
  publicacoes.splice(index, 1);
  carregarPublicacoes();
}

document.addEventListener("DOMContentLoaded", () => {
  carregarPublicacoes();
});
