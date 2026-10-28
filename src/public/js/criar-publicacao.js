document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-publicacao");
  if (!form) return;

  const selectTipo = document.getElementById("tipo");
  const inputDataPublicacao = document.getElementById("data-publicacao");
  const inputDataFinal = document.getElementById("data-final");
  const editores = {
    noticia: document.getElementById("conteudo"),
    evento: document.getElementById("conteudo-evento"),
  };
  const blocos = {
    "1": document.getElementById("campos-noticia"),
    "2": document.getElementById("campos-evento"),
    "3": document.getElementById("campos-video"),
  };
  const botaoSalvar = document.getElementById("btn-salvar");

  const agora = new Date();
  const hoje = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000)
    .toISOString().split("T")[0];
  inputDataPublicacao.value = hoje;
  inputDataFinal.min = hoje;
  inputDataFinal.value = hoje;

  inputDataPublicacao.addEventListener("change", () => {
    if (!inputDataPublicacao.value) return;
    inputDataFinal.min = inputDataPublicacao.value;
    if (inputDataFinal.value && inputDataFinal.value < inputDataPublicacao.value) {
      inputDataFinal.value = inputDataPublicacao.value;
    }
  });

  function tipoSelecionado() {
    return ({ "1": "noticia", "2": "evento", "3": "video" })[selectTipo.value] || "";
  }

  function atualizarCamposDoTipo() {
    Object.entries(blocos).forEach(([valor, bloco]) => {
      if (!bloco) return;
      const ativo = valor === selectTipo.value;
      bloco.hidden = !ativo;
      bloco.disabled = !ativo;
      bloco.querySelectorAll("input, select, textarea").forEach(campo => {
        campo.disabled = !ativo;
        campo.required = ativo && campo.dataset.opcional !== "true";
      });
    });
  }

  selectTipo.addEventListener("change", atualizarCamposDoTipo);
  atualizarCamposDoTipo();

  document.querySelectorAll(".editor-toolbar button").forEach(botao => {
    botao.addEventListener("mousedown", event => event.preventDefault());
    botao.addEventListener("click", () => {
      const comando = botao.dataset.comando;
      const campo = botao.closest("fieldset")?.querySelector(".editor-conteudo");
      if (comando && campo) {
        campo.focus();
        document.execCommand(comando, false, null);
      }
    });
  });

  function mostrarMensagem(mensagem, sucesso = false) {
    let aviso = document.getElementById("mensagem-publicacao");
    if (!aviso) {
      aviso = document.createElement("p");
      aviso.id = "mensagem-publicacao";
      aviso.setAttribute("role", "status");
      form.prepend(aviso);
    }
    aviso.textContent = mensagem;
    aviso.style.padding = "12px";
    aviso.style.marginBottom = "16px";
    aviso.style.borderRadius = "8px";
    aviso.style.background = sucesso ? "#e8f5e9" : "#fdecea";
    aviso.style.color = sucesso ? "#1b5e20" : "#b71c1c";
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const tipo = tipoSelecionado();
    const editor = editores[tipo];
    const descricao = editor?.innerHTML.trim() || "";
    const descricaoTexto = editor?.innerText.trim() || "";

    if (!tipo) return mostrarMensagem("Selecione o tipo de publicação.");
    if (tipo !== "video" && !descricaoTexto) {
      editor?.focus();
      return mostrarMensagem("Preencha a descrição do conteúdo.");
    }

    const arquivo = tipo === "evento"
      ? document.getElementById("poster-evento").files[0]
      : tipo === "video"
        ? document.getElementById("arquivo-video").files[0]
        : null;
    if (tipo !== "noticia" && !arquivo) {
      return mostrarMensagem(tipo === "evento" ? "Selecione a imagem do evento." : "Selecione o vídeo.");
    }

    const dados = new FormData();
    dados.append("titulo", document.getElementById("titulo").value.trim());
    dados.append("tipo", tipo);
    dados.append("dataPublicacao", inputDataPublicacao.value);
    dados.append("dataFinal", inputDataFinal.value);
    dados.append("tempoTela", document.getElementById("tempo-tela").value || "10");
    dados.append("descricao", descricao);
    dados.append("categoria", "Geral");
    dados.append("tipoEvento", document.getElementById("tipo-evento").value.trim());
    dados.append("dataEvento", document.getElementById("data-evento").value);
    dados.append("publico", document.getElementById("publico-evento").value.trim());
    if (arquivo) dados.append("arquivo", arquivo);

    botaoSalvar.disabled = true;
    const textoOriginal = botaoSalvar.innerHTML;
    botaoSalvar.textContent = "Salvando...";

    try {
      const resposta = await fetch("/api/publicacoes", {
        method: "POST",
        credentials: "same-origin",
        body: dados,
      });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível salvar a publicação.");
      mostrarMensagem("Publicação salva no banco de dados com sucesso.", true);
      form.reset();
      inputDataPublicacao.value = hoje;
      inputDataFinal.value = hoje;
      atualizarCamposDoTipo();
      Object.values(editores).forEach(campo => { if (campo) campo.innerHTML = ""; });
    } catch (erro) {
      mostrarMensagem(erro.message || "Erro ao conectar com o servidor.");
    } finally {
      botaoSalvar.disabled = false;
      botaoSalvar.innerHTML = textoOriginal;
      if (typeof lucide !== "undefined" && lucide.createIcons) lucide.createIcons();
    }
  });
});
