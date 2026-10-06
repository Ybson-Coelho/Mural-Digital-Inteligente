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

    if (page === currentPage) {
      item.classList.add("active");
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadComponent("#header", "../components/header/header.html");
  await loadComponent("#sidebar", "../components/sidebar/sidebar.html");

  setActiveSidebarItem();

  lucide.createIcons();
});
