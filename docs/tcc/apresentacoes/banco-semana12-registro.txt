-- 🛠️ Passo 1: Criar a estrutura completo do Banco de Dados
CREATE DATABASE livraria;

USE livraria;

CREATE TABLE autores (
    id_autor INT PRIMARY KEY AUTO_INCREMENT,
    nome_autor VARCHAR(100)
);

CREATE TABLE categorias (
    id_categoria INT PRIMARY KEY AUTO_INCREMENT,
    nome_categoria VARCHAR(50)
);

CREATE TABLE livros (
    id_livro INT PRIMARY KEY AUTO_INCREMENT,
    titulo VARCHAR(150),
    id_autor INT,
    id_categoria INT,
    preco DECIMAL(10, 2),
    FOREIGN KEY (id_autor) REFERENCES autores(id_autor),
    FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria)
);

INSERT INTO autores (nome_autor) VALUES
('Machado de Assis'), ('J. K. Rowling');

INSERT INTO categorias (nome_categoria) VALUES
('Romance'), ('Fantasia');

INSERT INTO livros (titulo, id_autor, id_categoria, preco) VALUES
('Dom Casmurro', 1, 1, 29.90),
('Harry Potter e a Pedra Filosofal', 2, 2, 49.90);


-- 🛠️ Passo 2: Modificar a estrutura com ALTER TABLE

-- Adicionar coluna data_publicacao em livros
ALTER TABLE livros
ADD data_publicacao DATE;

DESC livros;

-- 🗑️ Passo 3: Remover estrutura com DROP TABLE
DROP TABLE categorias;


-- ✅ Pergunta 1: Como criar a tabela editoras e relacionar com livros, sabendo que cada livro tem apenas uma editora?
CREATE TABLE editoras (
    id_editora INT PRIMARY KEY AUTO_INCREMENT,
    nome_editora VARCHAR(100)
);

ALTER TABLE livros
ADD id_editora INT,
ADD FOREIGN KEY (id_editora) REFERENCES editoras(id_editora);


-- ✅ Pergunta 2: Como modificar a tabela livros para adicionar quantidade_estoque e num_paginas, e garantir que quantidade_estoque nunca seja negativa?
ALTER TABLE livros
ADD quantidade_estoque INT CHECK (quantidade_estoque >= 0),
ADD num_paginas INT;