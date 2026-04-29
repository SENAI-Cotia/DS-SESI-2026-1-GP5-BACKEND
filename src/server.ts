import express from "express";
import prisma from "./lib/prisma"
import bcrypt from "bcrypt"

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

//Cadastro////////////// - Arthur Laccotis
app.post("/cadastro", async (req, res) => {
  const { email, password, name, rm, curso, telNumero } = req.body

  //validação da regra de negocio
  if (password.length <= 8) {
    return res.status(400).json({ error: "A senha deve ter mais de 8 caracteres" })
  }

  if (!email || !password || !name || !rm || !curso || !telNumero) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" })
  }

  //criptografia
  const senhaCriptografada = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { name, password: senhaCriptografada, email, rm, curso, telNumero, funcao: "usuario" }
  })

  return res.status(201).json({
  id: user.id,
  email: user.email,
  name: user.name
})

})

//Login////////////// - Pietro Augusto
app.post("/login", async (req, res) => {
  const { email, password } = req.body

  try {
  if (!email || !password) {
    return res.status(400).json({ error: "Email e senha obrigatórios" })
  }

  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user) {
    return res.status(401).json({ error: "Credenciais inválidas" })
  }

  const passwordMatch = await bcrypt.compare(password, user.password)

  if (!passwordMatch) {
    return res.status(401).json({ error: "Credenciais inválidas" })
  }

  return res.status(200).json({
    message: "Login realizado com sucesso!",
    user: {
      id: user.id,
      email: user.email
    }
  })

  } catch (error) {
  return res.status(500).json({ error: "Erro interno do servidor" })
}
})


//Login Produto Novo////// - Pietro Augusto & Arthur Laccotis
app.post("/produtos", async (req, res) => {
  const { name, categoria, preco, condicao, imagem, descricao, disponibilidade, atacado, userId } = req.body;

  if (!name || !categoria || !preco || !condicao || !descricao || !userId) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    return res.status(404).json({ error: "Usuário não encontrado" });
  }

  const novoProduto = await prisma.produto.create({
    data: { name, categoria, preco, condicao, imagem, descricao, disponibilidade: disponibilidade === true || disponibilidade === "true", atacado: atacado === true || atacado === "true", userId }
  });

  return res.status(201).json({
    message: "Seu produto foi cadastrado com sucesso!",
    produto: novoProduto
  })

});

//Interesse Produto///// - Pietro Augusto & Arthur Laccotis
app.post("/interesse", async (req, res) => {
  const { userId, produtoId, local, horario } = req.body;

  if (!userId || !produtoId || !local || !horario) {
    return res.status(400).json({
      error: "userId, produtoId, local e horario são obrigatórios"
    });
  }

  const comprador = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!comprador) {
    return res.status(404).json({ error: "Usuário não encontrado" });
  }

  const produto = await prisma.produto.findUnique({
    where: { id: produtoId },
    include: { user: true }
  });

  if (!produto) {
    return res.status(404).json({ error: "Produto não encontrado" });
  }

  // evita o cara comprar o próprio produto
  if (produto.userId === userId) {
    return res.status(400).json({
      error: "Você não pode demonstrar interesse no seu próprio produto"
    });
  }

  const interesse = await prisma.interesse.create({
    data: {
      userId,
      produtoId,
      local,
      horario
    }
  });

  return res.status(201).json({
    message: "Interesse enviado com sucesso!",
    interesse,
    vendedor: {
      id: produto.user.id,
      name: produto.user.name,
      telNumero: produto.user.telNumero
    }
  });
});

//Confirmar Produto//// - Pietro Augusto e Arthur Laccotis

app.put("/interesse/:id/confirmar", async (req, res) => {
  const { id } = req.params;

  const interesse = await prisma.interesse.findUnique({
    where: { id: Number(id) },
    include: {
      produto: true,
      user: true
    }
  });

  if (!interesse) {
    return res.status(404).json({ error: "Interesse não encontrado" });
  }

  const atualizado = await prisma.interesse.update({
    where: { id: Number(id) },
    data: { status: "confirmado" }
  });

  return res.json({
    message: "Troca confirmada!",
    interesse: atualizado
  });
});


app.listen(3000, () => {
  console.log(`Server is running on port ${3000}`);
});
