
document.addEventListener('DOMContentLoaded', async () => {
    const caminho = window.location.pathname;
    const permissoesNecessarias = {
        '/pages/acessos.html': ['gerenciar_usuarios'],
        '/pages/criar-publicacao.html': [
            'gerenciar_publicacoes',
            'gerenciar_noticias',
            'gerenciar_eventos',
            'gerenciar_videos'
        ],
        '/pages/gerenciar-publicacoes.html': [
            'gerenciar_publicacoes',
            'gerenciar_noticias',
            'gerenciar_eventos',
            'gerenciar_videos'
        ]
    };

    try {
        const resposta = await fetch('/api/sessao', {
            credentials: 'same-origin'
        });

        const sessao = await resposta.json();

        if (!sessao.autenticado) {
            window.location.replace('/pages/login.html');
            return;
        }

        const exigidas = permissoesNecessarias[caminho];

        if (exigidas) {
            const permissoes = sessao.permissoes || [];
            const autorizado = exigidas.some(
                permissao => permissoes.includes(permissao)
            );

            if (!autorizado) {
                document.body.innerHTML =
                    '<main style="padding:40px;font-family:Arial,sans-serif">' +
                    '<h1>Acesso negado</h1>' +
                    '<p>Sua conta não possui permissão para acessar esta página.</p>' +
                    '<a href="/">Voltar ao início</a></main>';
            }
        }
    } catch (erro) {
        window.location.replace('/pages/login.html');
    }
});
    