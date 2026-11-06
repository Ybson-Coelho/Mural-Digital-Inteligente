const DOMINIOS_EMAIL = ["@estudante.ifto.edu.br", "@ifto.edu.br"];

const MENSAGEM_EMAIL_INVALIDO =
  "Use um e-mail @estudante.ifto.edu.br ou @ifto.edu.br.";

function emailValido(email) {
  const endereco = String(email || "").trim().toLowerCase();

  if (!endereco) {
    return false;
  }

  const dominio = DOMINIOS_EMAIL.find((item) => endereco.endsWith(item));

  if (!dominio) {
    return false;
  }

  const local = endereco.slice(0, -dominio.length);

  return /^[^\s@]+$/.test(local);
}

module.exports = {
  DOMINIOS_EMAIL,
  MENSAGEM_EMAIL_INVALIDO,
  emailValido,
};
