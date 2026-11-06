document.addEventListener("DOMContentLoaded", async () => {
  if (
    typeof lucide !== "undefined" &&
    typeof lucide.createIcons === "function"
  ) {
    lucide.createIcons();
  }

  const form = document.getElementById("form-senha");
  const botao = document.getElementById("btn-salvar");
  const campoSenha = document.getElementById("nova-senha");
  const campoConfirmar = document.getElementById("confirmar-senha");

  try {
    const resposta = await fetch(`${API_URL}/sessao`, {
      credentials: "include",
    });

    const sessao = await resposta.json();

    if (!sessao.autenticado) {
      window.location.replace("/pages/login.html");
      return;
    }

    if (!sessao.usuario.precisa_trocar_senha) {
      window.location.replace("/pages/painel.html");
      return;
    }
  } catch (erro) {
    window.location.replace("/pages/login.html");
    return;
  }

  form?.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    if (campoSenha.value.length < 8) {
      mostrarToast("A nova senha deve ter pelo menos 8 caracteres.", "aviso");
      return;
    }

    if (campoSenha.value !== campoConfirmar.value) {
      mostrarToast("A confirmação da senha não confere.", "aviso");
      return;
    }

    botao.disabled = true;
    botao.textContent = "Salvando...";

    try {
      const resposta = await fetch(`${API_URL}/trocar-senha`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senhaNova: campoSenha.value,
          confirmacao: campoConfirmar.value,
        }),
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(resultado.erro || "Não foi possível salvar a senha.");
      }

      guardarToastPendente("Senha alterada com sucesso!", "sucesso");
      window.location.href = "/pages/painel.html";
    } catch (erro) {
      mostrarToast(
        erro.message || "Não foi possível conectar ao servidor.",
        "erro",
      );
      botao.disabled = false;
      botao.textContent = "Salvar nova senha";
    }
  });
});
