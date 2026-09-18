const filtrosMural = document.querySelectorAll(
    '.tela2-mural__filter'
);

const publicacoesMural = document.querySelectorAll(
    '.tela2-mural__card'
);

filtrosMural.forEach(function (botao) {

    botao.addEventListener('click', function () {

        filtrosMural.forEach(function (outroBotao) {

            outroBotao.classList.remove(
                'tela2-mural__filter--active'
            );

        });

        botao.classList.add(
            'tela2-mural__filter--active'
        );

        const filtro = botao.dataset.filtro;

        publicacoesMural.forEach(function (publicacao) {

            const tipo = publicacao.dataset.tipo;

            if (filtro === 'todos' || filtro === tipo) {
                publicacao.style.display = 'flex';
            } else {
                publicacao.style.display = 'none';
            }

        });

    });

});