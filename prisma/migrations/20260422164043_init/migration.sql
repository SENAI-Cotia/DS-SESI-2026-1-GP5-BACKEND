-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rm" INTEGER NOT NULL,
    "curso" TEXT NOT NULL,
    "funcao" TEXT NOT NULL,
    "telNumero" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Produto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "preco" INTEGER NOT NULL,
    "condicao" TEXT NOT NULL,
    "imagem" BLOB NOT NULL,
    "descricao" TEXT NOT NULL,
    "disponibilidade" BOOLEAN NOT NULL,
    "atacado" BOOLEAN NOT NULL,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "Produto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Comentario" (
    "produtoId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "data" INTEGER NOT NULL,
    "cometario" TEXT NOT NULL,
    CONSTRAINT "Comentario_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Comentario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
