/*
  Warnings:

  - You are about to alter the column `preco` on the `Produto` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.

*/
-- CreateTable
CREATE TABLE "Interesse" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "local" TEXT NOT NULL,
    "horario" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Interesse_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Interesse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Produto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "preco" REAL NOT NULL,
    "condicao" TEXT NOT NULL,
    "imagem" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "disponibilidade" BOOLEAN NOT NULL,
    "atacado" BOOLEAN NOT NULL,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "Produto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Produto" ("atacado", "categoria", "condicao", "descricao", "disponibilidade", "id", "imagem", "name", "preco", "userId") SELECT "atacado", "categoria", "condicao", "descricao", "disponibilidade", "id", "imagem", "name", "preco", "userId" FROM "Produto";
DROP TABLE "Produto";
ALTER TABLE "new_Produto" RENAME TO "Produto";
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rm" INTEGER NOT NULL,
    "curso" TEXT NOT NULL,
    "funcao" TEXT NOT NULL,
    "telNumero" TEXT NOT NULL
);
INSERT INTO "new_User" ("curso", "email", "funcao", "id", "name", "password", "rm", "telNumero") SELECT "curso", "email", "funcao", "id", "name", "password", "rm", "telNumero" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
