function aplicarCadeado(elemento, mensagem) {
  if (!elemento) return;

  elemento.classList.add("bloqueado");
  elemento.setAttribute("aria-disabled", "true");
  elemento.title = mensagem;

  if (!elemento.querySelector(".cadeado-icone")) {
    const icone = document.createElement("span");
    icone.className = "cadeado-icone";
    icone.innerHTML = '<i data-lucide="lock"></i>';
    elemento.appendChild(icone);
  }

  if (!elemento.dataset.cadeadoAtivo) {
    elemento.dataset.cadeadoAtivo = "true";

    elemento.addEventListener(
      "click",
      (evento) => {
        evento.preventDefault();
        evento.stopPropagation();
        mostrarToast(elemento.title, "aviso");
      },
      true,
    );
  }

  if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  }
}
