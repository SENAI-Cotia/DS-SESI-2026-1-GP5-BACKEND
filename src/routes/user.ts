import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../prisma';

const router = Router();

// GET /cursos — lista os cursos únicos cadastrados no sistema (fonte oficial)
router.get('/cursos', async (req, res) => {
  try {
    const users = await prisma.user.findMany({ select: { curso: true } });
    const cursos = [...new Set(users.map(u => u.curso).filter(Boolean))].sort();
    return res.json({ cursos });
  } catch (error) {
    console.error('Erro ao buscar cursos:', error);
    return res.status(500).json({ error: 'Erro ao buscar cursos' });
  }
});

// POST /login — busca usuário no banco e verifica senha
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    const senhaCorreta = await bcrypt.compare(password, user.password);
    if (!senhaCorreta) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    return res.json({
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        rm: user.rm,
        curso: user.curso,
        funcao: user.funcao,
        telNumero: user.telNumero,
      },
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return res.status(500).json({ error: 'Erro interno ao fazer login' });
  }
});

// POST /cadastro — cria novo usuário
router.post('/cadastro', async (req, res) => {
  const { email, password, name, rm, curso, telNumero } = req.body;

  if (!email || !password || !name || rm == null || !curso || !telNumero) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios: email, password, name, rm, curso, telNumero' });
  }

  if (typeof password !== 'string' || password.length <= 8) {
    return res.status(400).json({ error: 'A senha deve ter mais de 8 caracteres' });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ error: 'Email já cadastrado' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: passwordHash,
      name,
      rm: Number(rm),
      curso,
      telNumero,
      funcao: 'usuario',
    },
    select: {
      id: true,
      email: true,
      name: true,
      rm: true,
      curso: true,
      funcao: true,
      telNumero: true,
    },
  });

  return res.status(201).json({ message: 'Usuário criado com sucesso', user });
});

// GET /cadastro/:id — busca usuário por ID
router.get('/cadastro/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        rm: true,
        curso: true,
        telNumero: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// PUT /cadastro/:id — atualiza usuário
router.put('/cadastro/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, email, telNumero, curso, rm } = req.body;

  if (!id || !name || !email) {
    return res.status(400).json({ error: 'ID, name e email são obrigatórios' });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        telNumero,
        curso,
        rm: rm != null ? Number(rm) : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        rm: true,
        curso: true,
        funcao: true,
        telNumero: true,
      },
    });

    return res.json({ message: 'Usuário atualizado com sucesso', user });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return res.status(500).json({ error: 'Não foi possível atualizar o usuário.' });
  }
});

export { router as userRouter };