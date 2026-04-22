import express from "express";
import prisma from "./lib/prisma"
import bcrypt from "bcrypt"

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

//cadastro//////////////
app.post ("/cadastro", async (req, res) => {
  const { email, password, name, rm, curso, funcao, telnumero,  } = req.body

  //validação da regra de negocio
  if(password.length <= 8) {
    return res.status(400).json({error: "A senha deve ter mais de 8 caracteres"})
  }

  //criptografia
  const senhaCriptografada = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {name, password: senhaCriptografada}
  })

  return res.status(201).json(user)

})

app.listen(3000, () => {
  console.log(`Server is running on port ${3000}`);
});
