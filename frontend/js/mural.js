const containerPublicacoes = document.getElementById("publicacoes");
const botoesFiltro = document.querySelectorAll(".tela2-mural__filter");

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
  aviso.className = "tela2-mural__empty";

  const icone = document.createElement("div");
  icone.className = "tela2-mural__empty-icon";
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
  const caminho =
    publicacao.tipo === "video" ? "" : urlArquivo(publicacao.imagem);

  if (!caminho && publicacao.tipo !== "video") return null;

  const area = document.createElement("div");
  area.className = "tela2-mural__card-image";

  const fundo = document.createElement("img");
  fundo.className = "tela2-mural__card-image-fundo";
  fundo.alt = "";
  fundo.setAttribute("aria-hidden", "true");

  const imagem = document.createElement("img");
  imagem.className = "tela2-mural__card-image-frente";
  imagem.alt = publicacao.titulo || "Imagem da publicação";

  if (caminho) {
    fundo.src = caminho;
    imagem.src = caminho;

    fundo.addEventListener("error", () => fundo.remove(), { once: true });
    imagem.addEventListener("error", () => area.remove(), { once: true });
  } else {
    prepararImagem(fundo, "");
    prepararImagem(imagem, "");
  }

  area.append(fundo, imagem);

  if (publicacao.tipo === "video") {
    const play = document.createElement("span");
    play.className = "tela2-mural__play";
    play.innerHTML = '<i data-lucide="play"></i>';
    area.appendChild(play);
  }

  return area;
}

function criarConteudo(publicacao) {
  const conteudo = document.createElement("div");
  conteudo.className = "tela2-mural__card-content";

  const tag = document.createElement("span");
  tag.className = "tela2-mural__tag";
  tag.textContent = nomesTipo[publicacao.tipo] || publicacao.tipo;

  const titulo = document.createElement("h2");
  titulo.textContent = publicacao.titulo || "Sem título";

  const descricao = document.createElement("p");
  descricao.textContent = textoSemHTML(publicacao.descricao);

  const data = document.createElement("span");
  data.className = "tela2-mural__date";
  data.textContent = formatarData(publicacao.data);

  conteudo.append(tag, titulo, descricao, data);

  return conteudo;
}

function criarSeta() {
  const seta = document.createElement("div");
  seta.className = "tela2-mural__arrow";
  seta.innerHTML = '<i data-lucide="chevron-right"></i>';
  return seta;
}

function atualizarIcones() {
  if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  }
}

function criarCard(publicacao) {
  const card = document.createElement("article");
  card.className = "tela2-mural__card";
  card.dataset.tipo = publicacao.tipo;

  const imagem = criarImagem(publicacao);

  if (imagem) {
    card.appendChild(imagem);
  } else {
    card.classList.add("tela2-mural__card--sem-imagem");
  }

  card.append(criarConteudo(publicacao), criarSeta());

  card.addEventListener("click", () => {
    window.location.href = `visualizar.html#id=${publicacao.id}`;
  });

  return card;
}

function filtrarCards() {
  document.querySelectorAll(".tela2-mural__card").forEach((card) => {
    const mostrar = filtroAtivo === "todos" || filtroAtivo === card.dataset.tipo;
    card.style.display = mostrar ? "flex" : "none";
  });
}

function ativarFiltro(botao) {
  botoesFiltro.forEach((item) =>
    item.classList.remove("tela2-mural__filter--active"),
  );

  botao.classList.add("tela2-mural__filter--active");
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
