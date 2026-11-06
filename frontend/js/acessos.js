const listaUsuarios = document.getElementById("usuarios-list");
const modalUsuario = document.getElementById("modal-usuario");
const form = document.getElementById("userForm");
const formTitulo = document.getElementById("form-titulo");
const permissionsList = document.getElementById("permissions-list");
const caixaSenha = document.getElementById("caixa-senha");
const campoSenhaTemporaria = document.getElementById("senha-temporaria");
const areaSenhaTemporaria = document.getElementById("area-senha-temporaria");
const btnSalvar = document.getElementById("btn-salvar");

let usuarios = [];
let permissoesDisponiveis = [];
let usuarioEmEdicao = null;
let usuarioLogado = null;

function escaparHTML(valor) {
  return String(valor ?? "").replace(
    /[&<>"']/g,
    (caractere) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[caractere],
  );
}

function mostrarSenhaTemporaria(senha) {
  campoSenhaTemporaria.value = senha;
  document.getElementById("btn-copiar").textContent = "Copiar";
  caixaSenha.hidden = false;
  caixaSenha.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function esconderSenhaTemporaria() {
  campoSenhaTemporaria.value = "";
  caixaSenha.hidden = true;
}

function editandoPropriaConta() {
  return Boolean(
    usuarioEmEdicao &&
      usuarioLogado &&
      usuarioEmEdicao.id_usuario === usuarioLogado.id_usuario,
  );
}

function renderizarPermissoes(selecionadas) {
  permissionsList.innerHTML = "";

  const propriaConta = editandoPropriaConta();

  permissoesDisponiveis.forEach((permissao) => {
    const label = document.createElement("label");
    label.className = "checkbox-item";

    const campo = document.createElement("input");
    campo.type = "checkbox";
    campo.name = "permissions";
    campo.value = permissao.nome_permissoes;
    campo.checked = selecionadas.includes(permissao.nome_permissoes);

    const travarGerenciarUsuarios =
      propriaConta && permissao.nome_permissoes === "gerenciar_usuarios";

    if (travarGerenciarUsuarios) {
      campo.checked = true;
      campo.disabled = true;
    }

    const texto = document.createElement("span");
    texto.textContent =
      permissao.descricao_permissoes || permissao.nome_permissoes;

    label.append(campo, texto);
    permissionsList.appendChild(label);

    if (travarGerenciarUsuarios) {
      aplicarCadeado(
        label,
        "Você não pode remover a sua própria permissão de gerenciar usuários.",
      );
    }
  });
}

function criarLinhaUsuario(usuario) {
  const item = document.createElement("div");
  item.className = "usuario-item";
  item.dataset.id = usuario.id_usuario;

  const nome = document.createElement("span");
  nome.className = "usuario-nome";
  nome.textContent = usuario.nome_usuario;

  const email = document.createElement("span");
  email.className = "usuario-email";
  email.textContent = usuario.email_usuario;

  const permissoes = document.createElement("div");
  permissoes.className = "usuario-permissoes";

  usuario.permissoes.forEach((permissao) => {
    const tag = document.createElement("span");
    tag.className = "usuario-tag";
    tag.textContent = permissao.nome_permissoes;
    permissoes.appendChild(tag);
  });

  if (usuario.precisa_trocar_senha) {
    const tag = document.createElement("span");
    tag.className = "usuario-tag usuario-tag-aviso";
    tag.textContent = "troca de senha pendente";
    permissoes.appendChild(tag);
  }

  const acoes = document.createElement("div");
  acoes.className = "usuario-acoes";

  const editar = document.createElement("button");
  editar.type = "button";
  editar.className = "btn btn-primary btn-editar";
  editar.dataset.id = usuario.id_usuario;
  editar.title = "Editar";
  editar.setAttribute("aria-label", `Editar usuário: ${usuario.nome_usuario}`);
  editar.innerHTML = '<i data-lucide="edit"></i>';

  const excluir = document.createElement("button");
  excluir.type = "button";
  excluir.className = "btn btn-danger btn-excluir";
  excluir.dataset.id = usuario.id_usuario;
  excluir.title = "Excluir";
  excluir.setAttribute(
    "aria-label",
    `Excluir usuário: ${usuario.nome_usuario}`,
  );
  excluir.innerHTML = '<i data-lucide="trash-2"></i>';

  if (usuarioLogado && usuario.id_usuario === usuarioLogado.id_usuario) {
    aplicarCadeado(
      excluir,
      "Você não pode excluir o seu próprio usuário.",
    );
  }

  acoes.append(editar, excluir);
  item.append(nome, email, permissoes, acoes);

  return item;
}

function mostrarUsuarios() {
  if (!listaUsuarios) return;

  listaUsuarios.innerHTML = "";

  if (usuarios.length === 0) {
    listaUsuarios.innerHTML =
      '<p class="sem-publicacoes">Nenhum usuário cadastrado.</p>';
    return;
  }

  usuarios.forEach((usuario) => {
    listaUsuarios.appendChild(criarLinhaUsuario(usuario));
  });
}

async function carregarUsuarios() {
  try {
    const resposta = await fetch(`${API_URL}/usuarios`, {
      credentials: "include",
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(resultado.erro || "Não foi possível carregar os usuários.");
    }

    usuarios = Array.isArray(resultado) ? resultado : [];
    mostrarUsuarios();
  } catch (erro) {
    listaUsuarios.innerHTML = "";
    const aviso = document.createElement("p");
    aviso.className = "sem-publicacoes";
    aviso.textContent = erro.message;
    listaUsuarios.appendChild(aviso);
  }
}

async function carregarPermissoes() {
  try {
    const resposta = await fetch(`${API_URL}/permissoes`, {
      credentials: "include",
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        resultado.erro || "Não foi possível carregar as permissões.",
      );
    }

    permissoesDisponiveis = Array.isArray(resultado) ? resultado : [];
    renderizarPermissoes([]);
  } catch (erro) {
    permissionsList.innerHTML = `<p class="sem-publicacoes">${escaparHTML(erro.message)}</p>`;
  }
}

function abrirFormulario(usuario) {
  usuarioEmEdicao = usuario || null;
  esconderSenhaTemporaria();

  form.reset();

  if (usuario) {
    formTitulo.textContent = "Editar usuário";
    btnSalvar.textContent = "Salvar alterações";
    document.getElementById("name").value = usuario.nome_usuario;
    document.getElementById("email").value = usuario.email_usuario;

    const selecionadas = usuario.permissoes.map(
      (permissao) => permissao.nome_permissoes,
    );
    renderizarPermissoes(selecionadas);
    areaSenhaTemporaria.hidden = false;
  } else {
    formTitulo.textContent = "Novo usuário";
    btnSalvar.textContent = "Salvar usuário";
    renderizarPermissoes([]);
    areaSenhaTemporaria.hidden = true;
  }

  modalUsuario.hidden = false;
  document.body.classList.add("modal-aberto");
  document.getElementById("name").focus();
}

function fecharFormulario() {
  usuarioEmEdicao = null;
  form.reset();
  modalUsuario.hidden = true;
  document.body.classList.remove("modal-aberto");
  esconderSenhaTemporaria();
}

document.getElementById("btn-novo-usuario")?.addEventListener("click", () => {
  abrirFormulario(null);
});

document.getElementById("btn-cancelar")?.addEventListener("click", () => {
  fecharFormulario();
});

document
  .getElementById("btn-fechar-formulario")
  ?.addEventListener("click", () => {
    fecharFormulario();
  });

modalUsuario?.addEventListener("click", (evento) => {
  if (evento.target === modalUsuario) fecharFormulario();
});

document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape" && modalUsuario && !modalUsuario.hidden) {
    fecharFormulario();
  }
});

document.getElementById("btn-copiar")?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(campoSenhaTemporaria.value);
    document.getElementById("btn-copiar").textContent = "Copiado";
  } catch (erro) {
    campoSenhaTemporaria.select();
    document.execCommand("copy");
    document.getElementById("btn-copiar").textContent = "Copiado";
  }
});

document.getElementById("btn-nova-senha")?.addEventListener("click", () => {
  if (!usuarioEmEdicao) return;

  mostrarConfirmacao({
    titulo: "Gerar nova senha?",
    mensagem:
      "O usuário vai receber uma senha temporária e precisará trocá-la no próximo acesso.",
    textoConfirmar: "Gerar",
    icone: "key-round",
    aoConfirmar: async () => {
      try {
        const resposta = await fetch(
          `${API_URL}/usuarios/${usuarioEmEdicao.id_usuario}/senha-temporaria`,
          {
            method: "POST",
            credentials: "include",
          },
        );

        const resultado = await resposta.json();

        if (!resposta.ok) {
          throw new Error(
            resultado.erro || "Não foi possível gerar a senha temporária.",
          );
        }

        mostrarSenhaTemporaria(resultado.senhaTemporaria);
        mostrarToast("Nova senha temporária gerada.");
        await carregarUsuarios();
      } catch (erro) {
        mostrarToast(erro.message, "erro");
      }
    },
  });
});

listaUsuarios?.addEventListener("click", async (evento) => {
  const botaoEditar = evento.target.closest(".btn-editar");

  if (botaoEditar) {
    const usuario = usuarios.find(
      (item) => item.id_usuario === Number(botaoEditar.dataset.id),
    );
    if (usuario) abrirFormulario(usuario);
    return;
  }

  const botaoExcluir = evento.target.closest(".btn-excluir");

  if (botaoExcluir) {
    const usuario = usuarios.find(
      (item) => item.id_usuario === Number(botaoExcluir.dataset.id),
    );

    if (!usuario) return;

    mostrarConfirmacao({
      titulo: "Excluir usuário?",
      mensagem: `Tem certeza que deseja excluir ${usuario.nome_usuario}?`,
      aoConfirmar: async () => {
        try {
          const resposta = await fetch(
            `${API_URL}/usuarios/${usuario.id_usuario}`,
            {
              method: "DELETE",
              credentials: "include",
            },
          );

          const resultado = await resposta.json();

          if (!resposta.ok) {
            throw new Error(resultado.erro || "Não foi possível excluir.");
          }

          if (
            usuarioEmEdicao &&
            usuarioEmEdicao.id_usuario === usuario.id_usuario
          ) {
            fecharFormulario();
          }

          mostrarToast("Usuário excluído com sucesso!");
          await carregarUsuarios();
        } catch (erro) {
          mostrarToast(erro.message, "erro");
        }
      },
    });
  }
});

form?.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const nome = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim().toLowerCase();

  const permissoes = Array.from(
    document.querySelectorAll('input[name="permissions"]:checked'),
  ).map((campo) => campo.value);

  if (nome.length < 2) {
    mostrarToast("Informe o nome do usuário.", "aviso");
    return;
  }

  if (!email) {
    mostrarToast("Informe o e-mail do usuário.", "aviso");
    return;
  }

  if (!emailValido(email)) {
    mostrarToast(MENSAGEM_EMAIL_INVALIDO, "erro");
    return;
  }

  if (permissoes.length === 0) {
    mostrarToast("Selecione pelo menos uma permissão.", "aviso");
    return;
  }

  const editando = Boolean(usuarioEmEdicao);
  const url = editando
    ? `${API_URL}/usuarios/${usuarioEmEdicao.id_usuario}`
    : `${API_URL}/usuarios`;

  btnSalvar.disabled = true;

  try {
    const resposta = await fetch(url, {
      method: editando ? "PUT" : "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ nome, email, permissoes }),
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(resultado.erro || "Não foi possível salvar o usuário.");
    }

    fecharFormulario();
    await carregarUsuarios();

    mostrarToast(
      editando ? "Usuário atualizado com sucesso!" : "Usuário cadastrado com sucesso!",
    );

    if (resultado.senhaTemporaria) {
      mostrarSenhaTemporaria(resultado.senhaTemporaria);
    }
  } catch (erro) {
    mostrarToast(erro.message, "erro");
  } finally {
    btnSalvar.disabled = false;
  }
});

async function carregarUsuarioLogado() {
  try {
    const resposta = await fetch(`${API_URL}/sessao`, {
      credentials: "include",
    });

    const sessao = await resposta.json();

    usuarioLogado = sessao.autenticado ? sessao.usuario : null;
  } catch (erro) {
    usuarioLogado = null;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([carregarUsuarioLogado(), carregarPermissoes()]);
  await carregarUsuarios();
});
