-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rm" INTEGER NOT NULL,
    "curso" TEXT NOT NULL,
    "funcao" TEXT NOT NULL,
    "telNumero" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Produto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "preco" REAL NOT NULL,
    "condicao" TEXT NOT NULL,
    "imagem" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "disponibilidade" BOOLEAN NOT NULL,
    "userId" INTEGER NOT NULL,
    "localId" INTEGER NOT NULL,
    "horarioId" INTEGER NOT NULL,
    CONSTRAINT "Produto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Produto_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local" ("Id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Produto_horarioId_fkey" FOREIGN KEY ("horarioId") REFERENCES "Horario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Interesse" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "horarioId" INTEGER NOT NULL,
    "localId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Interesse_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Interesse_horarioId_fkey" FOREIGN KEY ("horarioId") REFERENCES "Horario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Interesse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Interesse_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local" ("Id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Local" (
    "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "local" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Horario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "horario" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
