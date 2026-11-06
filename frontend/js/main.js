async function loadComponent(selector, path) {
  const element = document.querySelector(selector);

  if (!element) return;

  try {
    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(`Erro ao carregar ${path}`);
    }

    element.innerHTML = await response.text();
  } catch (error) {
    console.error(error);
  }
}

function setActiveSidebarItem() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const sidebarItems = document.querySelectorAll(".sidebar-item");

  sidebarItems.forEach((item) => {
    const page = item.getAttribute("href")?.split("/").pop() || "index.html";
    const isDirectMatch = page === currentPage;
    const isPublicationChild =
      currentPage === "criar-publicacao.html" &&
      page === "gerenciar-publicacoes.html";

    if (isDirectMatch || isPublicationChild) {
      item.classList.add("active");
    }
  });
}

async function carregarSessao() {
  try {
    const resposta = await fetch(`${API_URL}/sessao`, {
      credentials: "include",
    });

    return await resposta.json();
  } catch (erro) {
    console.error("Erro ao carregar dados do usuário:", erro);
    return null;
  }
}

function mostrarUsuario(sessao) {
  const elNomeUsuario = document.getElementById("nome-usuario");

  if (!elNomeUsuario) return;

  if (sessao && sessao.autenticado && sessao.usuario.nome_usuario) {
    elNomeUsuario.textContent = sessao.usuario.nome_usuario;
  } else {
    elNomeUsuario.textContent = "Visitante";
  }
}

function aplicarPermissoesMenu(permissoes) {
  document.querySelectorAll(".sidebar-item[data-permissoes]").forEach((item) => {
    const exigidas = (item.dataset.permissoes || "").split(",").filter(Boolean);
    const liberado = exigidas.some((permissao) => permissoes.includes(permissao));

    if (!liberado) {
      aplicarCadeado(
        item,
        "Você não tem permissão para acessar esta página.",
      );
    }
  });
}

function configurarLogout() {
  const botaoSair = document.querySelector(".sidebar-item.logout");
  if (!botaoSair) return;

  botaoSair.addEventListener("click", async (evento) => {
    evento.preventDefault();
    try {
      await fetch(`${API_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (erro) {
      console.error("Erro ao fazer logout:", erro);
    }
    window.location.href = "/index.html";
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    loadComponent("#header", "/components/header/header.html"),
    loadComponent("#sidebar", "/components/sidebar/sidebar.html"),
  ]);

  setActiveSidebarItem();

  const sessao = await carregarSessao();

  mostrarUsuario(sessao);
  aplicarPermissoesMenu((sessao && sessao.permissoes) || []);

  configurarLogout();

  if (
    typeof lucide !== "undefined" &&
    typeof lucide.createIcons === "function"
  ) {
    lucide.createIcons();
  }
});
