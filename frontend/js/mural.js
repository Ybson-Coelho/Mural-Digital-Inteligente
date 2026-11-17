const containerPublicacoes = document.getElementById("publicacoes");
const botoesFiltro = document.querySelectorAll(".mural-filter");

let filtroAtivo = "todos";

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

function textoSemHTML(valor) {
  const elemento = document.createElement("div");
  elemento.innerHTML = String(valor || "");
  return elemento.textContent.trim();
}

function mostrarAviso(titulo, texto) {
  if (!containerPublicacoes) return;

  const aviso = document.createElement("div");
  aviso.className = "mural-empty";

  const icone = document.createElement("div");
  icone.className = "mural-empty-icon";
  icone.innerHTML = '<i data-lucide="newspaper"></i>';

  const tituloElemento = document.createElement("h2");
  tituloElemento.textContent = titulo;

  const textoElemento = document.createElement("p");
  textoElemento.textContent = texto;

  aviso.append(icone, tituloElemento, textoElemento);
  containerPublicacoes.replaceChildren(aviso);
  atualizarIcones();
}

function criarImagem(publicacao) {
  const caminho = urlArquivo(publicacao.imagem);

  if (!caminho) return null;

  const area = document.createElement("div");
  area.className = "mural-card-image";

  const fundo = document.createElement("img");
  fundo.className = "mural-card-image-fundo";
  fundo.alt = "";
  fundo.setAttribute("aria-hidden", "true");

  const imagem = document.createElement("img");
  imagem.className = "mural-card-image-frente";
  imagem.alt = publicacao.titulo || "Imagem da publicação";

  fundo.src = caminho;
  imagem.src = caminho;

  fundo.addEventListener("error", () => fundo.remove(), { once: true });
  imagem.addEventListener("error", () => area.remove(), { once: true });

  area.append(fundo, imagem);

  return area;
}

function criarConteudo(publicacao) {
  const conteudo = document.createElement("div");
  conteudo.className = "mural-card-content";

  const tag = document.createElement("span");
  tag.className = "mural-tag";
  tag.textContent = nomesTipo[publicacao.tipo] || publicacao.tipo;

  const titulo = document.createElement("h2");
  titulo.textContent = publicacao.titulo || "Sem título";

  const data = document.createElement("span");
  data.className = "mural-date";
  data.textContent = formatarData(publicacao.data);

  conteudo.append(tag, titulo, data);

  if (publicacao.autor) {
    const autor = document.createElement("span");
    autor.className = "mural-autor";
    autor.textContent = `Por ${publicacao.autor}`;
    conteudo.append(autor);
  }

  return conteudo;
}

function criarSeta() {
  const seta = document.createElement("div");
  seta.className = "mural-arrow";
  seta.innerHTML = '<i data-lucide="chevron-right"></i>';
  return seta;
}

function atualizarIcones() {
  if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  }
}

function criarVideo(publicacao) {
  const idYouTube = extrairIdYouTube(publicacao.url);

  if (!idYouTube) return null;

  const area = document.createElement("div");
  area.className = "mural-card-image";

  const iframe = document.createElement("iframe");
  iframe.src = `https://www.youtube-nocookie.com/embed/${idYouTube}`;
  iframe.title = publicacao.titulo || "Vídeo";
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute(
    "allow",
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
  );
  iframe.setAttribute("allowfullscreen", "true");

  area.appendChild(iframe);

  return area;
}

function criarMidia(publicacao) {
  if (publicacao.tipo === "video") {
    const video = criarVideo(publicacao);

    if (video) return video;
  }

  return criarImagem(publicacao);
}

function criarCard(publicacao) {
  const card = document.createElement("article");
  card.className = "mural-card";
  card.dataset.tipo = publicacao.tipo;

  const midia = criarMidia(publicacao);

  if (midia) {
    card.appendChild(midia);
  } else {
    card.classList.add("mural-card--sem-imagem");
  }

  card.append(criarConteudo(publicacao), criarSeta());

  card.addEventListener("click", () => {
    window.location.href = `visualizar.html#id=${publicacao.id}`;
  });

  return card;
}

function filtrarCards() {
  document.querySelectorAll(".mural-card").forEach((card) => {
    const mostrar = filtroAtivo === "todos" || filtroAtivo === card.dataset.tipo;
    card.style.display = mostrar ? "flex" : "none";
  });
}

function ativarFiltro(botao) {
  botoesFiltro.forEach((item) =>
    item.classList.remove("mural-filter--active"),
  );

  botao.classList.add("mural-filter--active");
  filtroAtivo = botao.dataset.filtro;
  filtrarCards();
}

function configurarFiltros() {
  botoesFiltro.forEach((botao) => {
    botao.addEventListener("click", () => ativarFiltro(botao));
  });
}

function mostrarPublicacoes(publicacoes) {
  containerPublicacoes.innerHTML = "";

  publicacoes.forEach((publicacao) => {
    containerPublicacoes.appendChild(criarCard(publicacao));
  });

  atualizarIcones();
  filtrarCards();
}

async function carregarPublicacoes() {
  if (!containerPublicacoes) return;

  try {
    const resposta = await fetch(`${API_URL}/publicacoes`);

    if (!resposta.ok) {
      throw new Error("Erro ao carregar publicações.");
    }

    const publicacoes = await resposta.json();

    if (!Array.isArray(publicacoes) || publicacoes.length === 0) {
      mostrarAviso(
        "Nenhuma publicação disponível",
        "As publicações aparecerão aqui quando forem cadastradas.",
      );
      return;
    }

    mostrarPublicacoes(publicacoes);
  } catch (erro) {
    mostrarAviso(
      "Não foi possível carregar o mural",
      "Tente novamente mais tarde.",
    );
  }
}

document.addEventListener("DOMContentLoaded", () => {
  atualizarIcones();
  configurarFiltros();
  carregarPublicacoes();
});
