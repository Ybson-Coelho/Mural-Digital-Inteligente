const URL_BACKEND_PRODUCAO = "https://mural-digital-inteligente-backend.onrender.com";

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const API_ORIGIN = isLocalhost
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : URL_BACKEND_PRODUCAO;

const API_URL = `${API_ORIGIN}/api`;
const IMAGEM_PADRAO = "/assets/images/images (3).jpg";

function urlArquivo(caminho) {
  if (!caminho) return "";
  if (caminho.startsWith("/uploads/")) {
    return `${API_ORIGIN}${caminho}`;
  }
  return caminho;
}

function urlImagem(caminho) {
  return urlArquivo(caminho) || IMAGEM_PADRAO;
}

function aplicarFallbackImagem(imagem) {
  imagem.addEventListener(
    "error",
    () => {
      imagem.src = IMAGEM_PADRAO;
      imagem.classList.add("imagem-padrao");
    },
    { once: true },
  );
}

function prepararImagem(elemento, caminho) {
  elemento.src = urlImagem(caminho);
  elemento.classList.toggle("imagem-padrao", !caminho);
  aplicarFallbackImagem(elemento);
}

const DOMINIOS_EMAIL = ["@estudante.ifto.edu.br", "@ifto.edu.br"];
const MENSAGEM_EMAIL_INVALIDO =
  "Só são aceitos e-mails @estudante.ifto.edu.br ou @ifto.edu.br.";

function emailValido(email) {
  const endereco = String(email || "").trim().toLowerCase();

  if (!endereco) {
    return false;
  }

  const dominio = DOMINIOS_EMAIL.find((item) => endereco.endsWith(item));

  if (!dominio) {
    return false;
  }

  const local = endereco.slice(0, -dominio.length);

  return /^[^\s@]+$/.test(local);
}
