const parametros = new URLSearchParams(window.location.search);
const parametrosHash = new URLSearchParams(window.location.hash.slice(1));

function obterIdDaPublicacao() {
  const idDaURL = Number(parametros.get("id"));

  if (Number.isInteger(idDaURL) && idDaURL > 0) return idDaURL;

  const idDoHash = Number(parametrosHash.get("id"));

  return Number.isInteger(idDoHash) && idDoHash > 0 ? idDoHash : 0;
}

const idPublicacao = obterIdDaPublicacao();

const elementoTag = document.getElementById("publicacao-tag");
const elementoTitulo = document.getElementById("publicacao-titulo");
const elementoData = document.getElementById("publicacao-data");
const elementoAutor = document.getElementById("publicacao-autor");
const elementoMidia = document.getElementById("publicacao-midia");
const elementoMeta = document.getElementById("publicacao-meta");
const elementoTexto = document.getElementById("publicacao-texto");

const nomesTipo = {
  noticia: "Notícia",
  evento: "Evento",
  video: "Vídeo",
};

function formatarData(data) {
  if (!data) return "";

  const partes = String(data).split("-");

  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : data;
}

function limparMidia() {
  elementoMidia.innerHTML = "";
  elementoMidia.hidden = true;
}

function mostrarVazio(mensagem) {
  elementoTitulo.textContent = mensagem || "Publicação não encontrada.";
  elementoTag.hidden = true;
  elementoData.textContent = "";
  elementoMeta.hidden = true;
  elementoMeta.innerHTML = "";
  elementoTexto.innerHTML = "";
  limparMidia();
}

function mostrarImagem(caminho, titulo) {
  const endereco = urlArquivo(caminho);

  if (!endereco) {
    limparMidia();
    return;
  }

  elementoMidia.innerHTML = "<img alt=\"\" />";

  const imagem = elementoMidia.querySelector("img");
  imagem.alt = titulo || "Imagem da publicação";
  imagem.src = endereco;
  imagem.addEventListener("error", limparMidia, { once: true });

  elementoMidia.hidden = false;
}

function mostrarVideo(publicacao) {
  const idYouTube = extrairIdYouTube(publicacao.url);

  if (idYouTube) {
    elementoMidia.innerHTML = `
      <div class="video-container-16-9">
        <iframe
          src="https://www.youtube-nocookie.com/embed/${idYouTube}"
          title="${publicacao.titulo || "Vídeo"}"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>
    `;
    elementoMidia.hidden = false;
    return;
  }

  const endereco = urlArquivo(publicacao.url) || urlArquivo(publicacao.imagem);

  if (endereco && (endereco.endsWith(".mp4") || endereco.includes("/uploads/"))) {
    elementoMidia.innerHTML =
      "<video src=\"" + endereco + "\" controls playsinline></video>";
    elementoMidia.hidden = false;

    const video = elementoMidia.querySelector("video");
    video.addEventListener("error", () => limparMidia(), { once: true });
    return;
  }

  limparMidia();
}

function mostrarMidia(publicacao) {
  if (publicacao.tipo === "video") {
    mostrarVideo(publicacao);
    return;
  }

  mostrarImagem(publicacao.imagem, publicacao.titulo);
}

function mostrarMeta(publicacao) {
  const itens =
    publicacao.tipo === "evento"
      ? [publicacao.tipoEvento, publicacao.publico].filter(Boolean)
      : [];

  if (itens.length === 0) {
    elementoMeta.innerHTML = "";
    elementoMeta.hidden = true;
    return;
  }

  elementoMeta.innerHTML = itens
    .map((item) => `<span>${item}</span>`)
    .join("");
  elementoMeta.hidden = false;
}

function dataDaPublicacao(publicacao) {
  if (publicacao.tipo === "evento" && publicacao.dataEvento) {
    return publicacao.dataEvento;
  }

  return publicacao.data;
}

function preencherPagina(publicacao) {
  elementoTag.textContent = nomesTipo[publicacao.tipo] || publicacao.tipo;
  elementoTag.hidden = false;

  elementoTitulo.textContent = publicacao.titulo || "Sem título";
  elementoData.textContent = formatarData(dataDaPublicacao(publicacao));
  elementoAutor.textContent = publicacao.autor ? `Por ${publicacao.autor}` : "";
  elementoAutor.hidden = !publicacao.autor;
  elementoTexto.innerHTML = publicacao.descricao || "";

  mostrarMidia(publicacao);
  mostrarMeta(publicacao);

  document.title = `${elementoTitulo.textContent} - Mural Digital IFTO`;
}

async function buscarPublicacao() {
  const resposta = await fetch(`${API_URL}/publicacoes`);

  if (!resposta.ok) {
    throw new Error("Não foi possível carregar as publicações.");
  }

  const publicacoes = await resposta.json();

  if (!Array.isArray(publicacoes)) return null;

  return publicacoes.find((item) => item.id === idPublicacao) || null;
}

async function carregarPublicacao() {
  if (!Number.isInteger(idPublicacao) || idPublicacao < 1) {
    mostrarVazio();
    return;
  }

  try {
    const publicacao = await buscarPublicacao();

    if (!publicacao) {
      mostrarVazio();
      return;
    }

    preencherPagina(publicacao);
  } catch (erro) {
    mostrarVazio("Não foi possível carregar a publicação.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  }

  carregarPublicacao();
});
