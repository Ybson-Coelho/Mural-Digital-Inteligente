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

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    loadComponent("#header", "../components/header/header.html"),
    loadComponent("#sidebar", "../components/sidebar/sidebar.html"),
  ]);

  setActiveSidebarItem();

  if (
    typeof lucide !== "undefined" &&
    typeof lucide.createIcons === "function"
  ) {
    lucide.createIcons();
  }
});
