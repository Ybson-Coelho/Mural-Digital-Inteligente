document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("form-login");
  const mensagem = document.getElementById("mensagem-login");
  const botao = document.getElementById("btn-entrar");
  const toggleSenha = document.getElementById("toggleSenha");
  const senhaInput = document.getElementById("senha");

  function redirecionar() {
    window.location.href = "/pages/painel.html";
  }

  function alternarSenha() {
    const senhaVisivel = senhaInput.type === "text";

    senhaInput.type = senhaVisivel ? "password" : "text";

    toggleSenha.classList.toggle("fa-eye", senhaVisivel);
    toggleSenha.classList.toggle("fa-eye-slash", !senhaVisivel);

    toggleSenha.setAttribute(
      "aria-label",
      senhaVisivel ? "Mostrar senha" : "Ocultar senha",
    );
  }

  toggleSenha.addEventListener("click", alternarSenha);

  toggleSenha.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter" || evento.key === " ") {
      evento.preventDefault();
      alternarSenha();
    }
  });

  try {
    const resposta = await fetch("/api/sessao", {
      credentials: "same-origin",
    });

    if (!resposta.ok) {
      throw new Error("Não foi possível verificar a sessão.");
    }

    const sessao = await resposta.json();

    if (sessao.autenticado) {
      redirecionar();
      return;
    }
  } catch (erro) {
    mensagem.textContent = "Não foi possível verificar sua sessão.";
  }

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    mensagem.textContent = "";
    botao.disabled = true;
    botao.textContent = "Verificando...";

    try {
      const resposta = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          email: document.getElementById("email").value.trim().toLowerCase(),

          matricula: document.getElementById("matricula").value.trim(),

          senha: senhaInput.value,
        }),
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(resultado.erro || "Não foi possível entrar.");
      }

      redirecionar();
    } catch (erro) {
      mensagem.textContent =
        erro.message || "Não foi possível conectar ao servidor.";
    } finally {
      botao.disabled = false;
      botao.textContent = "Entrar";
    }
  });
});
