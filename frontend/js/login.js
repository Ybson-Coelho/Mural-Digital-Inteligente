document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("form-login");
  const botao = document.getElementById("btn-entrar");
  const toggleSenha = document.getElementById("toggleSenha");
  const senhaInput = document.getElementById("senha");

  function redirecionar(precisaTrocarSenha) {
    window.location.href = precisaTrocarSenha
      ? "/pages/criar-senha.html"
      : "/pages/painel.html";
  }

  function alternarSenha() {
    const senhaVisivel = senhaInput.type === "text";

    senhaInput.type = senhaVisivel ? "password" : "text";

    toggleSenha.innerHTML = `<i data-lucide="${senhaVisivel ? "eye" : "eye-off"}"></i>`;

    if (
      typeof lucide !== "undefined" &&
      typeof lucide.createIcons === "function"
    ) {
      lucide.createIcons();
    }

    toggleSenha.setAttribute(
      "aria-label",
      senhaVisivel ? "Mostrar senha" : "Ocultar senha",
    );
  }

  if (
    typeof lucide !== "undefined" &&
    typeof lucide.createIcons === "function"
  ) {
    lucide.createIcons();
  }

  toggleSenha?.addEventListener("click", alternarSenha);

  toggleSenha?.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter" || evento.key === " ") {
      evento.preventDefault();
      alternarSenha();
    }
  });

  try {
    const resposta = await fetch(`${API_URL}/sessao`, {
      credentials: "include",
    });

    if (!resposta.ok) {
      throw new Error("Não foi possível verificar a sessão.");
    }

    const sessao = await resposta.json();

    if (sessao.autenticado) {
      redirecionar(Boolean(sessao.usuario.precisa_trocar_senha));
      return;
    }
  } catch (erro) {
    mostrarToast("Não foi possível verificar sua sessão.", "erro");
  }

  form?.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();

    if (!emailValido(email)) {
      mostrarToast(MENSAGEM_EMAIL_INVALIDO, "erro");
      return;
    }

    botao.disabled = true;
    botao.textContent = "Verificando...";

    try {
      const resposta = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          senha: senhaInput.value,
        }),
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(resultado.erro || "Não foi possível entrar.");
      }

      redirecionar(Boolean(resultado.precisaTrocarSenha));
    } catch (erro) {
      mostrarToast(
        erro.message || "Não foi possível conectar ao servidor.",
        "erro",
      );
    } finally {
      botao.disabled = false;
      botao.textContent = "Entrar";
    }
  });
});
