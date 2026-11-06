document.addEventListener("DOMContentLoaded", async () => {
  const caminho = (window.location.pathname.split("/").pop() || "")
    .replace(/\.html$/i, "")
    .toLowerCase();

  const permissoesNecessarias = {
    painel: ["visualizar_painel"],
    acessos: ["gerenciar_usuarios"],
    "criar-publicacao": [
      "gerenciar_noticias",
      "gerenciar_eventos",
      "gerenciar_videos",
    ],
    "gerenciar-publicacoes": [
      "gerenciar_noticias",
      "gerenciar_eventos",
      "gerenciar_videos",
    ],
  };

  const permissoesDePublicacao = [
    "gerenciar_noticias",
    "gerenciar_eventos",
    "gerenciar_videos",
  ];

  function paginaPermitida(sessao) {
    const permissoes = sessao.permissoes || [];

    if (permissoes.includes("visualizar_painel")) {
      return "/pages/painel.html";
    }

    if (permissoes.some((permissao) => permissoesDePublicacao.includes(permissao))) {
      return "/pages/gerenciar-publicacoes.html";
    }

    if (permissoes.includes("gerenciar_usuarios")) {
      return "/pages/acessos.html";
    }

    return "/pages/mural.html";
  }

  try {
    const resposta = await fetch(`${API_URL}/sessao`, {
      credentials: "include",
    });

    const sessao = await resposta.json();

    if (!sessao.autenticado) {
      window.location.replace("/pages/login.html");
      return;
    }

    if (sessao.usuario && sessao.usuario.precisa_trocar_senha) {
      window.location.replace("/pages/criar-senha.html");
      return;
    }

    const exigidas = permissoesNecessarias[caminho];

    if (exigidas) {
      const permissoes = sessao.permissoes || [];
      const autorizado = exigidas.some((permissao) =>
        permissoes.includes(permissao),
      );

      if (!autorizado) {
        guardarToastPendente(
          "Você não tem permissão para acessar esta página.",
          "aviso",
        );
        window.location.replace(paginaPermitida(sessao));
      }
    }
  } catch (erro) {
    window.location.replace("/pages/login.html");
  }
});
