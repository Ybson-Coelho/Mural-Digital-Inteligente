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

async function carregarUsuarioHeader() {
  const elNomeUsuario = document.getElementById("nome-usuario");

  if (!elNomeUsuario) return;

  try {
    const resposta = await fetch("/api/sessao");
    const dados = await resposta.json();

    if (dados.autenticado && dados.usuario && dados.usuario.nome_usuario) {
      elNomeUsuario.textContent = dados.usuario.nome_usuario;
    } else {
      elNomeUsuario.textContent = "Visitante";
    }
  } catch (erro) {
    console.error("Erro ao carregar dados do usuário:", erro);
    elNomeUsuario.textContent = "Usuário";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    loadComponent("#header", "/components/header/header.html"),
    loadComponent("#sidebar", "/components/sidebar/sidebar.html"),
  ]);

  setActiveSidebarItem();
  await carregarUsuarioHeader();

  if (
    typeof lucide !== "undefined" &&
    typeof lucide.createIcons === "function"
  ) {
    lucide.createIcons();
  }
});
