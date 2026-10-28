const totalPublicacoes = document.getElementById("total-publicacoes");
const totalNoticias = document.getElementById("total-noticias");
const totalEventos = document.getElementById("total-eventos");
const totalVideos = document.getElementById("total-videos");
const listaPublicacoes = document.getElementById("publicacoes-list");

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

function mostrarQuantidade(elemento, quantidade) {
  if (elemento) {
    elemento.textContent = quantidade;
  }
}

function mostrarPublicacoes(publicacoes) {
  if (!listaPublicacoes) return;

  listaPublicacoes.innerHTML = "";

  const recentes = [...publicacoes]
    .sort((a, b) => {
      const dataA = new Date(a.dataPublicacao || a.data || 0);
      const dataB = new Date(b.dataPublicacao || b.data || 0);

      return dataB - dataA;
    })
    .slice(0, 5);

  if (!recentes.length) {
    listaPublicacoes.innerHTML = `
      <div class="sem-publicacoes">
        <h3>Nenhuma publicação encontrada</h3>
        <p>As publicações aparecerão aqui quando forem cadastradas.</p>
      </div>
    `;

    return;
  }

  recentes.forEach((publicacao) => {
    const item = document.createElement("div");
    item.className = "publicacao-item";

    const titulo = document.createElement("span");
    titulo.className = "publicacao-titulo";
    titulo.textContent = publicacao.titulo || "Sem título";

    const tipo = document.createElement("span");
    tipo.className = "publicacao-tipo";
    tipo.textContent = tipos[publicacao.tipo]?.nome || publicacao.tipo;

    const data = document.createElement("span");
    data.className = "publicacao-data";
    data.textContent = formatarData(
      publicacao.dataPublicacao || publicacao.data,
    );

    item.append(titulo, tipo, data);
    listaPublicacoes.appendChild(item);
  });
}

async function carregarPainel() {
  try {
    const resposta = await fetch("/api/publicacoes", {
      credentials: "same-origin",
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        resultado.erro || "Não foi possível carregar as publicações.",
      );
    }

    const publicacoes = Array.isArray(resultado) ? resultado : [];

    const noticias = publicacoes.filter((publicacao) => tipos[publicacao.tipo]?.id === 1);

    const eventos = publicacoes.filter(
      (publicacao) => tipos[publicacao.tipo]?.id === 2,
    );

    const videos = publicacoes.filter(
      (publicacao) => tipos[publicacao.tipo]?.id === 3,
    );

    mostrarQuantidade(totalPublicacoes, publicacoes.length);
    mostrarQuantidade(totalNoticias, noticias.length);
    mostrarQuantidade(totalEventos, eventos.length);
    mostrarQuantidade(totalVideos, videos.length);

    mostrarPublicacoes(publicacoes);
  } catch (erro) {
    console.error("Erro ao carregar o painel:", erro);

    if (listaPublicacoes) {
      listaPublicacoes.innerHTML = `
        <div class="sem-publicacoes">
          <h3>Erro ao carregar publicações</h3>
          <p>${erro.message}</p>
        </div>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", carregarPainel);
