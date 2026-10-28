
CREATE DATABASE IF NOT EXISTS viva_ciencia
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE viva_ciencia;

CREATE TABLE IF NOT EXISTS publicacao (
    numero_public INT PRIMARY KEY AUTO_INCREMENT,
    titulo_public VARCHAR(250) NOT NULL,
    data_public DATE NOT NULL,
    data_fim_public DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS noticia (
    fk_public INT PRIMARY KEY,
    tempo_exibicao_not BIGINT NOT NULL,
    categoria_not VARCHAR(250) NOT NULL,
    descricao_not VARCHAR(250) NOT NULL,
    FOREIGN KEY (fk_public)
        REFERENCES publicacao(numero_public)
);

CREATE TABLE IF NOT EXISTS evento (
    fb_public INT PRIMARY KEY,
    tipo_evento VARCHAR(250) NOT NULL,
    data_evento DATE NOT NULL,
    poster_imagem_evento VARCHAR(250) NOT NULL,
    descricao_evento VARCHAR(250) NOT NULL,
    publico_evento VARCHAR(250) NOT NULL,
    FOREIGN KEY (fb_public)
        REFERENCES publicacao(numero_public)
);

CREATE TABLE IF NOT EXISTS video (
    fp_public INT PRIMARY KEY,
    duracao_video BIGINT NOT NULL,
    link_video VARCHAR(250) NOT NULL,
    FOREIGN KEY (fp_public)
        REFERENCES publicacao(numero_public)
);

CREATE TABLE IF NOT EXISTS permissoes (
    id_permissoes INT PRIMARY KEY AUTO_INCREMENT,
    nome_permissoes VARCHAR(250) UNIQUE NOT NULL,
    descricao_permissoes VARCHAR(250)
);

CREATE TABLE IF NOT EXISTS usuario (
    id_usuario INT PRIMARY KEY AUTO_INCREMENT,
    nome_usuario VARCHAR(250) NOT NULL,
    matricula_usuario VARCHAR(50) UNIQUE NULL,
    email_usuario VARCHAR(250) UNIQUE NOT NULL,
    senha_usuario VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS usuario_permissoes (
    fk_permissoes INT NOT NULL,
    fk_usuario INT NOT NULL,
    PRIMARY KEY (fk_permissoes, fk_usuario),
    FOREIGN KEY (fk_permissoes)
        REFERENCES permissoes(id_permissoes),
    FOREIGN KEY (fk_usuario)
        REFERENCES usuario(id_usuario)
);

INSERT IGNORE INTO permissoes
    (nome_permissoes, descricao_permissoes)
VALUES
    ('gerenciar_usuarios',
     'Criar usuários e definir permissões'),
    ('gerenciar_noticias',
     'Criar e administrar notícias'),
    ('gerenciar_eventos',
     'Criar e administrar eventos'),
    ('gerenciar_videos',
     'Adicionar e administrar vídeos'),
    ('gerenciar_publicacoes',
     'Administrar publicações em geral'),
    ('visualizar_painel',
     'Acessar o painel administrativo');

SELECT
    id_permissoes,
    nome_permissoes,
    descricao_permissoes
FROM permissoes
ORDER BY id_permissoes;
