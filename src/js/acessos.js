document.addEventListener('DOMContentLoaded', () => {
  const passwordInput = document.getElementById('password');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const togglePasswordIcon = document.getElementById('togglePasswordIcon');
  const userForm = document.getElementById('userForm');

  // Alternar Visibilidade da Senha
  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    
    togglePasswordIcon.classList.toggle('fa-eye', !isPassword);
    togglePasswordIcon.classList.toggle('fa-eye-slash', isPassword);
  });

  // Evento de Envio do Formulário
  userForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = document.getElementById('name').value;
    const registration = document.getElementById('registration').value;
    const password = document.getElementById('password').value;

    // Coleta as permissões selecionadas
    const selectedPermissions = Array.from(
      document.querySelectorAll('input[name="permissions"]:checked')
    ).map(cb => cb.value);

    // Validação de permissões
    if (selectedPermissions.length === 0) {
      alert('Por favor, selecione ao menos uma permissão para o usuário.');
      return;
    }

    // Objeto do Usuário
    const newUser = {
      nome: name,
      matricula: registration,
      senha: password,
      permissoes: selectedPermissions,
      dataCadastro: new Date().toLocaleString('pt-BR')
    };

    console.log('Novo Usuário Cadastrado:', newUser);
    alert(`Usuário "${name}" (Matrícula: ${registration}) cadastrado com sucesso!`);

    // Limpar Formulário
    userForm.reset();
  });
});