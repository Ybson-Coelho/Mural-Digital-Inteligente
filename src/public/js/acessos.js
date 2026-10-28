document.addEventListener("DOMContentLoaded", () => {
  const passwordInput = document.getElementById("password");
  const togglePasswordBtn = document.getElementById("togglePasswordBtn");
  const togglePasswordIcon = document.getElementById("togglePasswordIcon");
  const userForm = document.getElementById("userForm");

  if (!passwordInput || !togglePasswordBtn || !userForm) return;

  togglePasswordBtn.addEventListener("click", () => {
    const mostrar = passwordInput.type === "password";
    passwordInput.type = mostrar ? "text" : "password";

    togglePasswordIcon?.classList.toggle("fa-eye", !mostrar);
    togglePasswordIcon?.classList.toggle("fa-eye-slash", mostrar);
    togglePasswordBtn.setAttribute(
      "aria-label",
      mostrar ? "Ocultar senha" : "Mostrar senha",
    );
  });

  userForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const botao = userForm.querySelector('button[type="submit"]');
    const nome = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const matricula = document.getElementById("registration").value.trim();
    const senha = passwordInput.value;

    const permissoes = Array.from(
      document.querySelectorAll('input[name="permissions"]:checked'),
    ).map((campo) => campo.value);

    if (permissoes.length === 0) {
      alert("Selecione pelo menos uma permissão.");
      return;
    }

    if (senha.length < 8) {
      alert("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    botao.disabled = true;

    try {
      const resposta = await fetch("/api/usuarios", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome,
          email,
          matricula,
          senha,
          permissoes,
        }),
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado.erro || "Não foi possível cadastrar o usuário.",
        );
      }

      alert("Usuário cadastrado com sucesso!");
      userForm.reset();
      passwordInput.type = "password";
      togglePasswordIcon?.classList.add("fa-eye");
      togglePasswordIcon?.classList.remove("fa-eye-slash");
    } catch (erro) {
      alert(erro.message || "Erro ao cadastrar usuário.");
    } finally {
      botao.disabled = false;
    }
  });
});
