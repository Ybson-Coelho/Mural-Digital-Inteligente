document.addEventListener('DOMContentLoaded', () => {
  
  const btnPublicacoes = document.getElementById('btn-publicacoes');
  
  if (btnPublicacoes) {
    btnPublicacoes.addEventListener('click', (e) => {
      e.preventDefault();
      const navDropdown = btnPublicacoes.closest('.nav-dropdown');
      
      if (navDropdown) {
        navDropdown.classList.toggle('open');
      }
    });
  }

  const allNavItems = document.querySelectorAll('.nav-item, .submenu-item');

  allNavItems.forEach(item => {
    item.addEventListener('click', function(e) {
      if (this.classList.contains('nav-dropdown-toggle')) return;
      allNavItems.forEach(i => i.classList.remove('active'));
      this.classList.add('active');
    });
  });

  const userProfileBtn = document.getElementById('user-profile-btn');

  if (userProfileBtn) {
    userProfileBtn.addEventListener('click', () => {
      userProfileBtn.classList.toggle('open');
    });
  }

});