import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

const parseBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
};

const normalizeArray = (v: any) => {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v;
  try { const p = JSON.parse(v); if (Array.isArray(p)) return p; } catch {}
  return [v];
};

function formatProduto(p: any) {
  return {
    ...p,
    imagem: typeof p.imagem === 'string' ? JSON.parse(p.imagem) : p.imagem,
    local: p.local?.local ? (typeof p.local.local === 'string' ? JSON.parse(p.local.local) : p.local.local) : [],
    horario: p.horario?.horario ? (typeof p.horario.horario === 'string' ? JSON.parse(p.horario.horario) : p.horario.horario) : [],
  };
}

// GET /produtos
router.get('/', async (req, res) => {
  try {
    const products = await prisma.produto.findMany({
      where: { disponibilidade: true },
      include: {
        user: { select: { id: true, name: true, curso: true, email: true, telNumero: true } },
        local: true,
        horario: true,
      },
    });
    res.json(products.map(formatProduto));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

// GET /produtos/meus?userId=X — produtos do usuário (inclui vendidos)
router.get('/meus', async (req, res) => {
  const userId = Number(req.query.userId);
  if (!userId || isNaN(userId)) return res.status(400).json({ error: 'userId obrigatório' });
  try {
    const products = await prisma.produto.findMany({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, curso: true, email: true, telNumero: true } },
        local: true,
        horario: true,
      },
    });
    res.json(products.map(formatProduto));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar produtos do usuário' });
  }
});

// GET /produtos/interesses/comprador?userId=X — interesses do usuário como comprador (Últimos Pedidos)
router.get('/interesses/comprador', async (req, res) => {
  const userId = Number(req.query.userId);
  if (!userId || isNaN(userId)) return res.status(400).json({ error: 'userId obrigatório' });

  try {
    const interesses = await prisma.interesse.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        produto: {
          include: {
            user: { select: { id: true, name: true, curso: true, email: true, telNumero: true } },
          },
        },
        local: true,
        horario: true,
      },
    });

    const result = interesses.map(i => ({
      id: i.id,
      status: i.status,
      createdAt: i.createdAt,
      localEscolhido: typeof i.local.local === 'string' ? JSON.parse(i.local.local) : i.local.local,
      horarioEscolhido: typeof i.horario.horario === 'string' ? JSON.parse(i.horario.horario) : i.horario.horario,
      produto: {
        id: i.produto.id,
        name: i.produto.name,
        preco: i.produto.preco,
        condicao: i.produto.condicao,
        descricao: i.produto.descricao,
        disponibilidade: i.produto.disponibilidade,
        imagem: typeof i.produto.imagem === 'string' ? JSON.parse(i.produto.imagem) : i.produto.imagem,
      },
      vendedor: {
        id: i.produto.user.id,
        name: i.produto.user.name,
        curso: i.produto.user.curso,
        email: i.produto.user.email,
        telNumero: i.produto.user.telNumero,
      },
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar pedidos' });
  }
});

// GET /produtos/interesses/vendedor?userId=X — interesses nos produtos do usuário como vendedor
router.get('/interesses/vendedor', async (req, res) => {
  const userId = Number(req.query.userId);
  if (!userId || isNaN(userId)) return res.status(400).json({ error: 'userId obrigatório' });

  try {
    const interesses = await prisma.interesse.findMany({
      where: { produto: { userId } },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, curso: true, email: true, telNumero: true } },
        produto: { select: { id: true, name: true, preco: true } },
        local: true,
        horario: true,
      },
    });

    const result = interesses.map(i => ({
      id: i.id,
      status: i.status,
      createdAt: i.createdAt,
      localEscolhido: typeof i.local.local === 'string' ? JSON.parse(i.local.local) : i.local.local,
      horarioEscolhido: typeof i.horario.horario === 'string' ? JSON.parse(i.horario.horario) : i.horario.horario,
      produto: {
        id: i.produto.id,
        name: i.produto.name,
        preco: i.produto.preco,
      },
      comprador: {
        id: i.user.id,
        name: i.user.name,
        curso: i.user.curso,
        email: i.user.email,
        telNumero: i.user.telNumero,
      },
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar interesses recebidos' });
  }
});

// DELETE /produtos/interesses/:id — cancela/retira interesse
router.delete('/interesses/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { userId } = req.body;

  if (!userId) return res.status(400).json({ error: 'userId obrigatório no body' });

  try {
    const interesse = await prisma.interesse.findUnique({ where: { id } });
    if (!interesse) return res.status(404).json({ error: 'Interesse não encontrado' });
    if (interesse.userId !== Number(userId))
      return res.status(403).json({ error: 'Você não pode cancelar um interesse de outro usuário' });

    await prisma.interesse.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cancelar interesse' });
  }
});

// POST /produtos/interesse — registra interesse
router.post('/interesse', async (req, res) => {
  const { userId, produtoId, localId, horarioId, local, horario } = req.body;

  if (!userId || !produtoId) {
    return res.status(400).json({ error: 'Campos obrigatórios: userId e produtoId' });
  }

  const comprador = await prisma.user.findUnique({ where: { id: Number(userId) } });
  if (!comprador) return res.status(404).json({ error: 'Usuário comprador não encontrado' });

  const produto = await prisma.produto.findUnique({
    where: { id: Number(produtoId) },
    include: { user: true },
  });
  if (!produto) return res.status(404).json({ error: 'Produto não encontrado' });
  if (produto.userId === Number(userId))
    return res.status(400).json({ error: 'Você não pode demonstrar interesse no seu próprio produto' });

  // Prevent duplicate interest from same user on same product
  const jaExiste = await prisma.interesse.findFirst({
    where: { userId: Number(userId), produtoId: Number(produtoId) },
  });
  if (jaExiste)
    return res.status(400).json({ error: 'Você já demonstrou interesse neste produto' });

  let usedLocalId = localId != null ? Number(localId) : undefined;
  let usedHorarioId = horarioId != null ? Number(horarioId) : undefined;

  if (!usedLocalId) {
    const localArr = normalizeArray(local);
    if (!localArr || localArr.length === 0)
      return res.status(400).json({ error: 'É necessário informar local ou localId' });
    const createdLocal = await prisma.local.create({ data: { local: JSON.stringify(localArr) } });
    usedLocalId = createdLocal.Id;
  }

  if (!usedHorarioId) {
    const horarioArr = normalizeArray(horario);
    if (!horarioArr || horarioArr.length === 0)
      return res.status(400).json({ error: 'É necessário informar horario ou horarioId' });
    const createdHorario = await prisma.horario.create({ data: { horario: JSON.stringify(horarioArr) } });
    usedHorarioId = createdHorario.id;
  }

  try {
    const interesse = await prisma.interesse.create({
      data: {
        userId: Number(userId),
        produtoId: Number(produtoId),
        localId: usedLocalId!,
        horarioId: usedHorarioId!,
      },
      include: {
        user: true,
        produto: { include: { user: true } },
        local: true,
        horario: true,
      },
    });

    return res.status(201).json({
      message: 'Interesse registrado com sucesso',
      interesse: {
        id: interesse.id,
        status: interesse.status,
        createdAt: interesse.createdAt,
        local: JSON.parse(interesse.local.local),
        horario: JSON.parse(interesse.horario.horario),
      },
      produto: {
        id: interesse.produto.id,
        name: interesse.produto.name,
        preco: interesse.produto.preco,
        condicao: interesse.produto.condicao,
        descricao: interesse.produto.descricao,
        disponibilidade: interesse.produto.disponibilidade,
        imagem: typeof interesse.produto.imagem === 'string' ? JSON.parse(interesse.produto.imagem) : interesse.produto.imagem,
      },
      comprador: {
        id: interesse.user.id,
        name: interesse.user.name,
        email: interesse.user.email,
        telNumero: interesse.user.telNumero,
      },
      vendedor: {
        id: interesse.produto.user.id,
        name: interesse.produto.user.name,
        email: interesse.produto.user.email,
        telNumero: interesse.produto.user.telNumero,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno ao registrar interesse' });
  }
});

// GET /produtos/:id
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    const product = await prisma.produto.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, curso: true, email: true, telNumero: true } },
        local: true,
        horario: true,
      },
    });
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
    return res.json(formatProduto(product));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar produto' });
  }
});

// POST /produtos
router.post('/', async (req, res) => {
  const { userId, name, preco, condicao, imagem, descricao, disponibilidade, local, horario } = req.body;

  if (!userId || !name || preco === undefined || !condicao || !imagem || !descricao || disponibilidade === undefined) {
    return res.status(400).json({ error: 'Campos obrigatórios: userId, name, preco, condicao, imagem, descricao, disponibilidade' });
  }

  const imagensArr = normalizeArray(imagem);
  if (!imagensArr || imagensArr.length === 0 || imagensArr.length > 5)
    return res.status(400).json({ error: 'imagem deve ser array com 1-5 itens' });

  const localArr = normalizeArray(local);
  if (localArr && localArr.length > 6) return res.status(400).json({ error: 'Máx 6 locais' });

  const horarioArr = normalizeArray(horario);
  if (horarioArr && horarioArr.length > 6) return res.status(400).json({ error: 'Máx 6 horários' });

  try {
    const usuario = await prisma.user.findUnique({ where: { id: Number(userId) } });
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });

    const createdLocal = await prisma.local.create({ data: { local: JSON.stringify(localArr ?? []) } });
    const createdHorario = await prisma.horario.create({ data: { horario: JSON.stringify(horarioArr ?? []) } });

    const produto = await prisma.produto.create({
      data: {
        userId: Number(userId),
        name,
        preco: Number(preco),
        condicao: Number(condicao),
        imagem: JSON.stringify(imagensArr),
        descricao,
        disponibilidade: Boolean(disponibilidade),
        localId: createdLocal.Id,
        horarioId: createdHorario.id,
      },
      include: {
        user: { select: { id: true, name: true, curso: true, email: true, telNumero: true } },
        local: true,
        horario: true,
      },
    });

    return res.status(201).json({ message: 'Produto criado', produto: formatProduto(produto) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno ao criar produto' });
  }
});

// PUT /produtos/:id — requer userId no body para validar propriedade
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

  const { name, preco, condicao, imagem, descricao, disponibilidade, userId, localId, horarioId, local, horario } = req.body;

  try {
    const product = await prisma.produto.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });

    if (userId != null && Number(userId) !== product.userId) {
      return res.status(403).json({ error: 'Você não tem permissão para editar este produto' });
    }

    let newLocalId = product.localId;
    let newHorarioId = product.horarioId;

    if (local !== undefined) {
      const localArr = normalizeArray(local);
      if (localArr && localArr.length > 0) {
        const createdLocal = await prisma.local.create({ data: { local: JSON.stringify(localArr) } });
        newLocalId = createdLocal.Id;
      }
    } else if (localId != null) {
      newLocalId = Number(localId);
    }

    if (horario !== undefined) {
      const horarioArr = normalizeArray(horario);
      if (horarioArr && horarioArr.length > 0) {
        const createdHorario = await prisma.horario.create({ data: { horario: JSON.stringify(horarioArr) } });
        newHorarioId = createdHorario.id;
      }
    } else if (horarioId != null) {
      newHorarioId = Number(horarioId);
    }

    const updated = await prisma.produto.update({
      where: { id },
      data: {
        name: name ?? product.name,
        preco: preco != null ? Number(preco) : product.preco,
        condicao: condicao != null ? Number(condicao) : product.condicao,
        imagem: imagem != null ? JSON.stringify(normalizeArray(imagem) ?? []) : product.imagem,
        descricao: descricao ?? product.descricao,
        disponibilidade: disponibilidade != null ? parseBoolean(disponibilidade) : product.disponibilidade,
        userId: product.userId,
        localId: newLocalId,
        horarioId: newHorarioId,
      },
      include: {
        user: { select: { id: true, name: true, curso: true, email: true, telNumero: true } },
        local: true,
        horario: true,
      },
    });

    res.json(formatProduto(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno ao atualizar produto' });
  }
});

// DELETE /produtos/:id — requer userId no body para validar propriedade
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

  const { userId } = req.body;

  try {
    const product = await prisma.produto.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });

    if (userId != null && Number(userId) !== product.userId) {
      return res.status(403).json({ error: 'Você não tem permissão para excluir este produto' });
    }

    // Delete related interesses first (FK constraint)
    await prisma.interesse.deleteMany({ where: { produtoId: id } });
    await prisma.produto.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno ao excluir produto' });
  }
});

export { router as productRouter };