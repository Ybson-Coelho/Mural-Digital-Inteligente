document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-publicacao");
  const selectTipo = document.getElementById("tipo");
  const inputDataPublicacao = document.getElementById("data-publicacao");
  const inputDataFinal = document.getElementById("data-final");
  const editor = document.getElementById("conteudo");

  const blocos = {
    1: document.getElementById("campos-noticia"),
    2: document.getElementById("campos-evento"),
    3: document.getElementById("campos-video"),
  };

  const hoje = new Date();
  const hojeISO = new Date(hoje.getTime() - hoje.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];

  inputDataPublicacao.value = hojeISO;
  inputDataFinal.min = hojeISO;

  inputDataPublicacao.addEventListener("change", () => {
    if (inputDataPublicacao.value) {
      inputDataFinal.min = inputDataPublicacao.value;
      if (
        inputDataFinal.value &&
        inputDataFinal.value < inputDataPublicacao.value
      ) {
        inputDataFinal.value = inputDataPublicacao.value;
      }
    }
  });

  function atualizarCamposDoTipo() {
    const tipo = selectTipo.value;

    Object.entries(blocos).forEach(([nome, bloco]) => {
      if (!bloco) return;
      const ativo = nome === tipo;
      bloco.hidden = !ativo;
      bloco.disabled = !ativo;

      bloco.querySelectorAll("input, select, textarea").forEach((campo) => {
        campo.disabled = !ativo;
      });
    });
  }

  selectTipo.addEventListener("change", atualizarCamposDoTipo);
  atualizarCamposDoTipo();

  document.querySelectorAll(".editor-toolbar button").forEach((botao) => {
    botao.addEventListener("mousedown", (e) => e.preventDefault());
    botao.addEventListener("click", () => {
      const comando = botao.dataset.comando;
      if (comando) {
        document.execCommand(comando, false, null);
        editor.focus();
      }
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    if (selectTipo.value === "1" && !editor.textContent.trim()) {
      editor.focus();
      return;
    }

    window.location.href = "gerenciar-publicacoes.html";
  });
});
