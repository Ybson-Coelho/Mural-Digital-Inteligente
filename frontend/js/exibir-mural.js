const URL_DO_MURAL = `${window.location.origin}/pages/mural.html`;

let publicacoes = [];
let atual = 0;
let temporizador;
let slideAtualId = null;

const area = document.getElementById("area-central");

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

function formatarData(data) {
  if (!data) return "";

  const partes = String(data).split("-");
  if (partes.length !== 3) return data;

  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

function publicacoesAtivas() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return publicacoes.filter((publicacao) => {
    const inicio = publicacao.data
      ? new Date(`${publicacao.data}T00:00:00`)
      : null;
    const fim = publicacao.dataFinal
      ? new Date(`${publicacao.dataFinal}T00:00:00`)
      : null;

    if (inicio && !Number.isNaN(inicio.getTime()) && inicio > hoje) {
      return false;
    }

    if (fim && !Number.isNaN(fim.getTime()) && fim < hoje) {
      return false;
    }

    return true;
  });
}

function montarImagem(publicacao) {
  const caminho = urlArquivo(publicacao.imagem);

  if (!caminho) return "";

  return `
    <div class="imagem">
      <img class="imagem-fundo" src="${caminho}" alt="" aria-hidden="true" />
      <img class="imagem-frente" src="${caminho}" alt="" />
    </div>
  `;
}

function montarEvento(publicacao) {
  const dataInicio = publicacao.dataEvento || publicacao.data;
  let periodo = formatarData(dataInicio);

  if (publicacao.dataFinal && publicacao.dataFinal !== dataInicio) {
    periodo += " a " + formatarData(publicacao.dataFinal);
  }

  return `
    <div class="texto">
      <span class="badge">Evento</span>
      <h2>${escaparHTML(publicacao.titulo)}</h2>
      <div class="descricao">${publicacao.descricao || ""}</div>
      <div class="meta">
        <span><strong>Data:</strong> ${periodo}</span>
        ${publicacao.publico ? `<span>${escaparHTML(publicacao.publico)}</span>` : ""}
      </div>
    </div>
    ${montarImagem(publicacao)}
  `;
}

function montarNoticia(publicacao) {
  return `
    <div class="texto">
      <span class="badge azul">Notícia</span>
      <h2>${escaparHTML(publicacao.titulo)}</h2>
      <div class="descricao">${publicacao.descricao || ""}</div>
      <div class="meta">
        <span>${formatarData(publicacao.data)}</span>
      </div>
    </div>
    ${montarImagem(publicacao)}
  `;
}

function montarVideo(publicacao) {
  const videoSrc = urlArquivo(publicacao.url) || urlArquivo(publicacao.imagem);

  return `
    <div class="video-area">
      ${
        videoSrc
          ? `<video src="${videoSrc}" autoplay muted playsinline></video>`
          : ""
      }
      <img
        class="video-fallback"
        src="${IMAGEM_PADRAO}"
        alt=""
        ${videoSrc ? "hidden" : ""}
      />
    </div>
    <span class="badge azul">Vídeo</span>
    <div class="legenda">${escaparHTML(publicacao.titulo)}</div>
  `;
}

function removerImagem(slide) {
  const bloco = slide.querySelector(".imagem");

  if (bloco) bloco.remove();

  slide.classList.add("sem-imagem");
}

function prepararImagens(slide) {
  slide.querySelectorAll(".imagem img").forEach((imagem) => {
    imagem.addEventListener("error", () => removerImagem(slide), {
      once: true,
    });

    if (imagem.complete && imagem.naturalWidth === 0) {
      removerImagem(slide);
    }
  });
}

function limparSlidesAntigos(slideNovo) {
  area.querySelectorAll(".slide").forEach((outro) => {
    if (outro === slideNovo) return;

    outro.classList.remove("visivel");

    const videoAntigo = outro.querySelector("video");
    if (videoAntigo) {
      videoAntigo.pause();
      videoAntigo.removeAttribute("src");
      videoAntigo.load();
    }

    setTimeout(() => {
      if (outro.parentNode) outro.remove();
    }, 700);
  });
}

function mostrar() {
  clearTimeout(temporizador);

  if (!area) return;

  const lista = publicacoesAtivas();

  if (lista.length === 0) {
    slideAtualId = null;
    area.innerHTML = `
      <div class="slide visivel">
        <div class="texto">
          <p class="descricao">Nenhuma publicação disponível no momento.</p>
        </div>
      </div>
    `;
    return;
  }

  atual = atual % lista.length;

  const publicacao = lista[atual];
  let conteudo = "";

  if (publicacao.tipo === "evento") {
    conteudo = montarEvento(publicacao);
  } else if (publicacao.tipo === "noticia") {
    conteudo = montarNoticia(publicacao);
  } else if (publicacao.tipo === "video") {
    conteudo = montarVideo(publicacao);
  }

  if (!conteudo) {
    proximo();
    return;
  }

  slideAtualId = publicacao.id;

  const semImagem =
    publicacao.tipo !== "video" && !urlArquivo(publicacao.imagem);

  const slide = document.createElement("div");
  slide.className = `slide ${publicacao.tipo}${semImagem ? " sem-imagem" : ""}`;
  slide.dataset.id = publicacao.id;
  slide.innerHTML = conteudo;
  area.appendChild(slide);

  prepararImagens(slide);

  requestAnimationFrame(() => {
    slide.classList.add("visivel");
  });

  limparSlidesAntigos(slide);

  if (publicacao.tipo === "video") {
    const video = slide.querySelector("video");
    const fallback = slide.querySelector(".video-fallback");

    const usarFallback = () => {
      if (video) video.hidden = true;
      if (fallback) fallback.hidden = false;

      clearTimeout(temporizador);
      temporizador = setTimeout(proximo, 5000);
    };

    if (video) {
      video.addEventListener("ended", () => proximo(), { once: true });
      video.addEventListener("error", usarFallback, { once: true });

      const tentativa = video.play();
      if (tentativa && typeof tentativa.catch === "function") {
        tentativa.catch(() => {});
      }
    } else {
      usarFallback();
    }
  } else {
    const tempo = Number(publicacao.tempoTela) || 10;
    temporizador = setTimeout(proximo, tempo * 1000);
  }
}

function proximo() {
  const lista = publicacoesAtivas();

  if (lista.length === 0) {
    mostrar();
    return;
  }

  atual = (atual + 1) % lista.length;
  mostrar();
}

async function carregarPublicacoes() {
  try {
    const resposta = await fetch(`${API_URL}/publicacoes`);

    if (!resposta.ok) {
      throw new Error("Erro ao carregar publicações.");
    }

    const dados = await resposta.json();
    const listaAnterior = publicacoesAtivas();

    publicacoes = Array.isArray(dados) ? dados : [];

    const listaNova = publicacoesAtivas();
    const mudou =
      JSON.stringify(listaAnterior) !== JSON.stringify(listaNova);

    if (!mudou) {
      if (!area?.querySelector(".slide")) mostrar();
      return;
    }

    const slideAtual = area?.querySelector(
      `.slide[data-id="${slideAtualId}"]`,
    );

    const continuaNaLista = listaNova.some(
      (publicacao) => publicacao.id === slideAtualId,
    );

    if (slideAtual && continuaNaLista) return;

    const indice = listaNova.findIndex(
      (publicacao) => publicacao.id === slideAtualId,
    );

    atual = indice >= 0 ? indice : 0;
    mostrar();
  } catch (erro) {
    if (!area?.querySelector(".slide")) {
      area.innerHTML = `
        <div class="slide visivel">
          <div class="texto">
            <p class="descricao">Aguardando publicações...</p>
          </div>
        </div>
      `;
    }
  }
}

function atualizarData() {
  const elData = document.getElementById("data-hoje");
  const elDia = document.getElementById("dia-semana");

  if (!elData || !elDia) return;

  const hoje = new Date();

  elData.textContent = hoje.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  elDia.textContent = hoje.toLocaleDateString("pt-BR", {
    weekday: "long",
  });
}

function gerarQRCode() {
  const elemento = document.getElementById("qrcode");
  if (!elemento) return;

  elemento.innerHTML = "";

  if (typeof QRCode !== "undefined") {
    new QRCode(elemento, {
      text: URL_DO_MURAL,
      width: 240,
      height: 240,
    });
  } else {
    elemento.textContent = "QR Code indisponível";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  atualizarData();
  setInterval(atualizarData, 60000);

  gerarQRCode();
  carregarPublicacoes();
  setInterval(carregarPublicacoes, 60000);
});
