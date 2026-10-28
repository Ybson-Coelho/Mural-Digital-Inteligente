
USE viva_ciencia;

ALTER TABLE usuario
ADD COLUMN matricula_usuario VARCHAR(50) UNIQUE NULL;
