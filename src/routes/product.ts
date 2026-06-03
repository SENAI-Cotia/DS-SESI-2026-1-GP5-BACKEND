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

// Helper: parse produto for API response (includes user, local, horario as parsed arrays)
function formatProduto(p: any) {
  return {
    ...p,
    imagem: typeof p.imagem === 'string' ? JSON.parse(p.imagem) : p.imagem,
    local: p.local?.local ? (typeof p.local.local === 'string' ? JSON.parse(p.local.local) : p.local.local) : [],
    horario: p.horario?.horario ? (typeof p.horario.horario === 'string' ? JSON.parse(p.horario.horario) : p.horario.horario) : [],
  };
}

// GET /produtos — lista todos os produtos com dados do criador, local e horário
router.get('/', async (req, res) => {
  try {
    const products = await prisma.produto.findMany({
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

// GET /produtos/:id — produto por ID com dados do criador, local e horário
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

// POST /produtos — cria produto
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
        condicao,
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

// PUT /produtos/:id — atualiza produto (suporta reativar anúncio via disponibilidade: true)
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

  const { name, preco, condicao, imagem, descricao, disponibilidade, userId, localId, horarioId, local, horario } = req.body;

  try {
    const product = await prisma.produto.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });

    // Se novos arrays de local/horario foram enviados, cria novas entradas
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
        condicao: condicao ?? product.condicao,
        imagem: imagem != null ? JSON.stringify(normalizeArray(imagem) ?? []) : product.imagem,
        descricao: descricao ?? product.descricao,
        disponibilidade: disponibilidade != null ? parseBoolean(disponibilidade) : product.disponibilidade,
        userId: userId != null ? Number(userId) : product.userId,
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

// DELETE /produtos/:id
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

  try {
    const product = await prisma.produto.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
    await prisma.produto.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno ao excluir produto' });
  }
});

export { router as productRouter };