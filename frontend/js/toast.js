const DURACAO_TOAST = 4000;
const CHAVE_TOAST_PENDENTE = "toastPendente";

function criarContainerToast() {
  let container = document.querySelector(".toast-container");

  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  return container;
}

function atualizarIconesToast() {
  if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  }
}

function nomeIconeToast(tipo) {
  const icones = {
    sucesso: "check-circle",
    erro: "x-circle",
    aviso: "alert-triangle",
  };

  return icones[tipo] || "info";
}

function mostrarToast(mensagem, tipo = "sucesso", duracao = DURACAO_TOAST) {
  const container = criarContainerToast();

  const toast = document.createElement("div");
  toast.className = `toast toast-${tipo}`;
  toast.setAttribute("role", tipo === "erro" ? "alert" : "status");

  const icone = document.createElement("span");
  icone.className = "toast-icone";
  icone.innerHTML = `<i data-lucide="${nomeIconeToast(tipo)}"></i>`;

  const texto = document.createElement("span");
  texto.className = "toast-texto";
  texto.textContent = mensagem;

  toast.append(icone, texto);
  container.appendChild(toast);

  atualizarIconesToast();

  setTimeout(() => toast.remove(), duracao);

  return toast;
}

function mostrarConfirmacao({
  titulo,
  mensagem,
  textoConfirmar = "Excluir",
  textoCancelar = "Cancelar",
  icone = "trash-2",
  aoConfirmar,
}) {
  const container = criarContainerToast();

  const toast = document.createElement("div");
  toast.className = "toast toast-confirmacao";
  toast.setAttribute("role", "alertdialog");
  toast.setAttribute("aria-label", titulo);

  const cabecalho = document.createElement("div");
  cabecalho.className = "toast-confirmacao-cabecalho";
  cabecalho.innerHTML = `<i data-lucide="${icone}"></i>`;

  const tituloElemento = document.createElement("strong");
  tituloElemento.textContent = titulo;
  cabecalho.appendChild(tituloElemento);

  const texto = document.createElement("p");
  texto.textContent = mensagem;

  const acoes = document.createElement("div");
  acoes.className = "toast-acoes";

  const cancelar = document.createElement("button");
  cancelar.type = "button";
  cancelar.className = "btn btn-secondary btn-small";
  cancelar.textContent = textoCancelar;

  const confirmar = document.createElement("button");
  confirmar.type = "button";
  confirmar.className = "btn btn-danger btn-small";
  confirmar.textContent = textoConfirmar;

  acoes.append(cancelar, confirmar);
  toast.append(cabecalho, texto, acoes);
  container.appendChild(toast);

  atualizarIconesToast();

  const fechar = () => {
    document.removeEventListener("keydown", aoPressionarTecla);
    toast.remove();
  };

  const aoPressionarTecla = (evento) => {
    if (evento.key === "Escape") fechar();
  };

  cancelar.addEventListener("click", fechar);

  confirmar.addEventListener("click", async () => {
    confirmar.disabled = true;
    cancelar.disabled = true;
    confirmar.textContent = "Aguarde...";

    try {
      await aoConfirmar();
    } finally {
      fechar();
    }
  });

  document.addEventListener("keydown", aoPressionarTecla);
  cancelar.focus();

  return toast;
}

function guardarToastPendente(mensagem, tipo = "aviso") {
  sessionStorage.setItem(
    CHAVE_TOAST_PENDENTE,
    JSON.stringify({ mensagem, tipo }),
  );
}

function mostrarToastPendente() {
  const salvo = sessionStorage.getItem(CHAVE_TOAST_PENDENTE);

  if (!salvo) return;

  sessionStorage.removeItem(CHAVE_TOAST_PENDENTE);

  try {
    const { mensagem, tipo } = JSON.parse(salvo);
    mostrarToast(mensagem, tipo);
  } catch (erro) {
    return;
  }
}

document.addEventListener("DOMContentLoaded", mostrarToastPendente);
