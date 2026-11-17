const TEMPO_MAXIMO_VIDEO = 60;
const TEMPO_ESPERA_VIDEO = 5000;
const TENTATIVAS_VIDEO = 3;

let publicacoes = [];
let atual = 0;
let temporizador;
let temporizadorVideo;
let temporizadorEspera;
let slideAtualId = null;
let qrAtual = "";
let playerAtual = null;
let iniciarPendente = null;
let apiPronta = false;

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

function montarAutor(publicacao) {
  if (!publicacao.autor) return "";

  return `<div class="autor">Por ${escaparHTML(publicacao.autor)}</div>`;
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
      ${montarAutor(publicacao)}
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
      ${montarAutor(publicacao)}
    </div>
    ${montarImagem(publicacao)}
  `;
}

function montarVideo(publicacao) {
  const idYouTube = extrairIdYouTube(publicacao.url);
  const videoSrc = urlArquivo(publicacao.url);

  let blocoMidia = "";

  if (idYouTube) {
    const miniatura = publicacao.imagem
      ? urlArquivo(publicacao.imagem)
      : `https://img.youtube.com/vi/${idYouTube}/maxresdefault.jpg`;

    blocoMidia = `
      <div class="video-area">
        <div class="video-player"></div>
        <img class="video-capa" src="${miniatura}" alt="" />
      </div>
    `;
  } else if (
    videoSrc &&
    (videoSrc.endsWith(".mp4") || videoSrc.startsWith("/uploads/"))
  ) {
    blocoMidia = `
      <div class="video-area">
        <video src="${videoSrc}" autoplay muted playsinline></video>
      </div>
    `;
  }

  return `
    ${blocoMidia}
    <span class="badge azul">Vídeo</span>
    <div class="legenda">
      ${escaparHTML(publicacao.titulo)}
      ${montarAutor(publicacao)}
    </div>
  `;
}

function onYouTubeIframeAPIReady() {
  apiPronta = true;

  if (iniciarPendente) {
    iniciarPendente();
    iniciarPendente = null;
  }
}

function pararPlayer(slide) {
  if (!slide || !slide.player) return;

  if (typeof slide.player.destroy === "function") {
    slide.player.destroy();
  }

  if (playerAtual === slide.player) {
    playerAtual = null;
  }

  slide.player = null;
}

function pedirQualidade() {
  if (!playerAtual) return;

  if (typeof playerAtual.setPlaybackQualityRange === "function") {
    playerAtual.setPlaybackQualityRange("hd1080", "hd1080");
  }

  if (typeof playerAtual.setPlaybackQuality === "function") {
    playerAtual.setPlaybackQuality("hd1080");
  }
}

function tocarVideo() {
  if (!playerAtual) return;

  if (typeof playerAtual.mute === "function") {
    playerAtual.mute();
  }

  if (typeof playerAtual.playVideo === "function") {
    playerAtual.playVideo();
  }
}

function conferirVideo(slide, publicacao, tentativa) {
  const estado =
    playerAtual && typeof playerAtual.getPlayerState === "function"
      ? playerAtual.getPlayerState()
      : -1;

  if (
    estado === YT.PlayerState.PLAYING ||
    estado === YT.PlayerState.BUFFERING ||
    estado === YT.PlayerState.CUED
  ) {
    return;
  }

  if (tentativa >= TENTATIVAS_VIDEO) {
    falhouVideo(slide, publicacao);
    return;
  }

  tocarVideo();

  temporizadorEspera = setTimeout(
    () => conferirVideo(slide, publicacao, tentativa + 1),
    TEMPO_ESPERA_VIDEO,
  );
}

function falhouVideo(slide, publicacao) {
  clearTimeout(temporizador);
  clearTimeout(temporizadorVideo);
  clearTimeout(temporizadorEspera);
  iniciarPendente = null;

  pararPlayer(slide);

  const capa = slide ? slide.querySelector(".video-capa") : null;

  if (capa) capa.hidden = false;

  const tempo = Number(publicacao.tempoTela) || 10;
  temporizador = setTimeout(proximo, tempo * 1000);
}

function iniciarVideo(slide, publicacao) {
  const capa = slide.querySelector(".video-capa");
  const video = slide.querySelector("video");
  const idYouTube = extrairIdYouTube(publicacao.url);

  if (capa) {
    capa.addEventListener("load", () => {
      if (!idYouTube || capa.dataset.trocada) return;

      if (!capa.src.includes("img.youtube.com") || capa.naturalWidth >= 320) {
        return;
      }

      capa.dataset.trocada = "sim";
      capa.src = `https://img.youtube.com/vi/${idYouTube}/hqdefault.jpg`;
    });

    capa.addEventListener("error", () => capa.remove(), { once: true });
  }

  if (video) {
    video.addEventListener("ended", () => proximo(), { once: true });
    video.addEventListener(
      "error",
      () => {
        slide.querySelector(".video-area")?.remove();
        proximo();
      },
      { once: true },
    );

    const tentativa = video.play();

    if (tentativa && typeof tentativa.catch === "function") {
      tentativa.catch(() => {});
    }

    return;
  }

  const alvo = slide.querySelector(".video-player");

  if (!idYouTube || !alvo) {
    falhouVideo(slide, publicacao);
    return;
  }

  temporizadorVideo = setTimeout(proximo, TEMPO_MAXIMO_VIDEO * 1000);
  temporizadorEspera = setTimeout(
    () => conferirVideo(slide, publicacao, 1),
    TEMPO_ESPERA_VIDEO,
  );

  const criar = () => {
    if (!alvo.isConnected) return;

    try {
      playerAtual = new YT.Player(alvo, {
        videoId: idYouTube,
        width: 1920,
        height: 1080,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          rel: 0,
          playsinline: 1,
          modestbranding: 1,
          iv_load_policy: 3,
          fs: 0,
          disablekb: 1,
          cc_load_policy: 0,
          vq: "hd1080",
        },
        events: {
          onReady: () => {
            tocarVideo();
            pedirQualidade();
          },
          onAutoplayBlocked: () => {
            tocarVideo();
          },
          onStateChange: (evento) => {
            if (evento.target !== playerAtual) return;

            if (evento.data === YT.PlayerState.PLAYING) {
              clearTimeout(temporizadorEspera);
              pedirQualidade();

              if (capa) capa.hidden = true;
            }

            if (evento.data === YT.PlayerState.ENDED) {
              proximo();
            }
          },
          onError: (evento) => {
            if (evento.target !== playerAtual) return;

            falhouVideo(slide, publicacao);
          },
        },
      });

      slide.player = playerAtual;

      const frame = slide.querySelector(".video-area iframe");

      if (frame) {
        frame.setAttribute(
          "allow",
          "autoplay; encrypted-media; picture-in-picture",
        );
      }
    } catch (erro) {
      falhouVideo(slide, publicacao);
    }
  };

  if (apiPronta) {
    criar();
  } else {
    iniciarPendente = criar;
  }
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
      pararPlayer(outro);

      if (outro.parentNode) outro.remove();
    }, 700);
  });
}

function mostrar() {
  clearTimeout(temporizador);
  clearTimeout(temporizadorVideo);
  clearTimeout(temporizadorEspera);

  if (playerAtual && typeof playerAtual.pauseVideo === "function") {
    playerAtual.pauseVideo();
  }

  if (!area) return;

  const lista = publicacoesAtivas();

  if (lista.length === 0) {
    slideAtualId = null;
    gerarQRCode();
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
  gerarQRCode(publicacao.id);

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
    iniciarVideo(slide, publicacao);
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

function gerarQRCode(idPublicacao) {
  const elemento = document.getElementById("qrcode");
  if (!elemento) return;

  const endereco = idPublicacao
    ? `${URL_FRONTEND}/pages/visualizar.html?id=${idPublicacao}`
    : `${URL_FRONTEND}/pages/mural.html`;

  if (endereco === qrAtual) return;

  qrAtual = endereco;
  elemento.innerHTML = "";

  if (typeof QRCode === "undefined") {
    elemento.textContent = "QR Code indisponível";
    return;
  }

  new QRCode(elemento, {
    text: endereco,
    width: 320,
    height: 320,
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof YT !== "undefined" && typeof YT.Player === "function") {
    apiPronta = true;
  }

  atualizarData();
  setInterval(atualizarData, 60000);

  gerarQRCode();
  carregarPublicacoes();
  setInterval(carregarPublicacoes, 60000);
});
