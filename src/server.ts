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

  return res.status(201).json(user)

})

//Login////////////// - Pietro Augusto
app.post("/login", async (req, res) => {
  const { email, password } = req.body

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

  return res.status(201).json(novoProduto) && res.send("Seu produto foi cadastrado com sucesso!")
});

app.listen(3000, () => {
  console.log(`Servidor rodando na porta ${3000}`);
});