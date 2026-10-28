const URL_DO_MURAL = "https://exemplo.com/mural";

const publicacoes = [
  {
    tipo: "evento",
    titulo: "Semana de Ciência e Tecnologia do IFTO",
    descricao: "Palestras e apresentações de projetos.",
    dataInicio: "2026-10-20",
    dataFim: "2026-10-24",
    dataFinalPublicacao: "2026-10-25",
    tempoTela: 15,
    local: "Campus do IFTO",
    publico: "Aberto ao público",
    imagem: null,
  },
  {
    tipo: "noticia",
    titulo: "Alunos conquistam medalha na olimpíada de robótica",
    descricao: "A equipe foi premiada na etapa regional.",
    data: "2026-10-09",
    dataFinalPublicacao: "2026-10-30",
    tempoTela: 10,
    fonte: "Comunicação IFTO",
    imagem: null,
  },
  {
    tipo: "video",
    titulo: "Institucional do campus",
    url: "videos/institucional.mp4",
    dataFinalPublicacao: "2026-11-30",
    tempoTela: 30,
  },
];

const area = document.getElementById("area-central");

let atual = 0;
let temporizador;

function formatarData(data) {
  if (!data) return "";

  const partes = data.split("-");
  if (partes.length !== 3) return data;

  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

function publicacoesAtivas() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return publicacoes.filter((p) => {
    if (!p.dataFinalPublicacao) return true;

    const final = new Date(p.dataFinalPublicacao + "T00:00:00");
    return final >= hoje;
  });
}

function montarEvento(p) {
  let periodo = formatarData(p.dataInicio);

  if (p.dataFim && p.dataFim !== p.dataInicio) {
    periodo += " a " + formatarData(p.dataFim);
  }

  const imagemEstilo = p.imagem
    ? `style="background-image: url('${p.imagem}')"`
    : "";

  return `
    <div class="texto">
      <span class="badge">Evento</span>
      <h2>${p.titulo}</h2>
      <p class="descricao">${p.descricao}</p>
      <div class="meta">
        <span><strong>Data:</strong> ${periodo}</span>
        ${p.local ? `<span><strong>Local:</strong> ${p.local}</span>` : ""}
        ${p.publico ? `<span>${p.publico}</span>` : ""}
      </div>
    </div>
    <div class="imagem" ${imagemEstilo}></div>
  `;
}

function montarNoticia(p) {
  const imagemEstilo = p.imagem
    ? `style="background-image: url('${p.imagem}')"`
    : "";

  return `
    <div class="texto">
      <span class="badge azul">Notícia</span>
      <h2>${p.titulo}</h2>
      <p class="descricao">${p.descricao}</p>
      <div class="meta">
        <span>${formatarData(p.data)}</span>
        ${p.fonte ? `<span>${p.fonte}</span>` : ""}
      </div>
    </div>
    <div class="imagem" ${imagemEstilo}></div>
  `;
}

function montarVideo(p) {
  return `
    <video src="${p.url}" autoplay muted playsinline></video>
    <span class="badge azul">Vídeo</span>
    <div class="legenda">${p.titulo}</div>
  `;
}

function mostrar() {
  clearTimeout(temporizador);

  if (!area) return;

  const lista = publicacoesAtivas();

  if (lista.length === 0) {
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

  const p = lista[atual];
  let conteudo = "";

  if (p.tipo === "evento") {
    conteudo = montarEvento(p);
  } else if (p.tipo === "noticia") {
    conteudo = montarNoticia(p);
  } else if (p.tipo === "video") {
    conteudo = montarVideo(p);
  }

  if (!conteudo) {
    proximo();
    return;
  }

  const slide = document.createElement("div");
  slide.className = `slide ${p.tipo}`;
  slide.innerHTML = conteudo;
  area.appendChild(slide);

  requestAnimationFrame(() => {
    slide.classList.add("visivel");
  });

  area.querySelectorAll(".slide").forEach((outro) => {
    if (outro !== slide) {
      outro.classList.remove("visivel");

      const videoAntigo = outro.querySelector("video");
      if (videoAntigo) {
        videoAntigo.pause();
        videoAntigo.removeAttribute("src");
        videoAntigo.load();
      }

      setTimeout(() => {
        if (outro.parentNode) {
          outro.remove();
        }
      }, 700);
    }
  });

  if (p.tipo === "video") {
    const video = slide.querySelector("video");

    if (video) {
      video.addEventListener("ended", () => proximo(), { once: true });

      video.addEventListener(
        "error",
        () => {
          slide.insertAdjacentHTML(
            "beforeend",
            '<div class="aviso">Vídeo indisponível</div>',
          );

          clearTimeout(temporizador);
          temporizador = setTimeout(proximo, 3000);
        },
        { once: true },
      );
    } else {
      temporizador = setTimeout(proximo, 3000);
    }
  } else {
    const tempo = p.tempoTela || 10;
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
  mostrar();
});
