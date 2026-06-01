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

router.get('/', async (req, res) => {
  const products = await prisma.produto.findMany();
  // opcional: parsear imagem/local/horario antes de enviar
  const parsed = products.map((p: { imagem: unknown }) => ({
    ...p,
    imagem: typeof p.imagem === 'string' ? JSON.parse(p.imagem) : p.imagem,
  }));
  res.json(parsed);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const product = await prisma.produto.findUnique({ where: { id } });
  if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
  return res.json({ ...product, imagem: typeof product.imagem === 'string' ? JSON.parse(product.imagem) : product.imagem });
});

router.post('/', async (req, res) => {
  const { userId, name, categoria, preco, condicao, imagem, descricao, disponibilidade, local, horario } = req.body;

  if (!userId || !name || !categoria || preco === undefined || !condicao || !imagem || !descricao || disponibilidade === undefined) {
    return res.status(400).json({ error: "Campos obrigatórios: userId, name, categoria, preco, condicao, imagem, descricao, disponibilidade" });
  }

  const imagensArr = normalizeArray(imagem);
  if (!imagensArr || imagensArr.length === 0 || imagensArr.length > 5) return res.status(400).json({ error: "imagem deve ser array com 1-5 itens" });

  const localArr = normalizeArray(local);
  if (localArr && localArr.length > 6) return res.status(400).json({ error: "Máx 6 locais" });

  const horarioArr = normalizeArray(horario);
  if (horarioArr && horarioArr.length > 6) return res.status(400).json({ error: "Máx 6 horários" });

  try {
    const usuario = await prisma.user.findUnique({ where: { id: Number(userId) } });
    if (!usuario) return res.status(404).json({ error: "Usuário não encontrado" });

    const createdLocal = await prisma.local.create({ data: { local: JSON.stringify(localArr ?? []) } });
    const createdHorario = await prisma.horario.create({ data: { horario: JSON.stringify(horarioArr ?? []) } });

    const produto = await prisma.produto.create({
      data: {
        userId: Number(userId),
        name,
        categoria,
        preco: Number(preco),
        condicao,
        imagem: JSON.stringify(imagensArr),
        descricao,
        disponibilidade: Boolean(disponibilidade),
        localId: createdLocal.Id,
        horarioId: createdHorario.id
      },
      include: {
        user: { select: { id: true, name: true, telNumero: true } }
      }
    });

    return res.status(201).json({ message: "Produto criado", produto: { ...produto, imagem: JSON.parse(produto.imagem) } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno ao criar produto" });
  }
});

router.post('/interesse', async (req, res) => {
  const { userId, produtoId, localId, horarioId, local, horario } = req.body;

  if (!userId || !produtoId) {
    return res.status(400).json({ error: 'Campos obrigatórios: userId e produtoId' });
  }

  const comprador = await prisma.user.findUnique({ where: { id: Number(userId) } });
  if (!comprador) {
    return res.status(404).json({ error: 'Usuário comprador não encontrado' });
  }

  const produto = await prisma.produto.findUnique({
    where: { id: Number(produtoId) },
    include: { user: true }
  });

  if (!produto) {
    return res.status(404).json({ error: 'Produto não encontrado' });
  }

  if (produto.userId === Number(userId)) {
    return res.status(400).json({ error: 'Você não pode demonstrar interesse no seu próprio produto' });
  }

  let usedLocalId = localId != null ? Number(localId) : undefined;
  let usedHorarioId = horarioId != null ? Number(horarioId) : undefined;

  if (!usedLocalId) {
    const localArr = normalizeArray(local);
    if (!localArr || localArr.length === 0) {
      return res.status(400).json({ error: 'É necessário informar local ou localId' });
    }
    const createdLocal = await prisma.local.create({ data: { local: JSON.stringify(localArr) } });
    usedLocalId = createdLocal.Id;
  }

  if (!usedHorarioId) {
    const horarioArr = normalizeArray(horario);
    if (!horarioArr || horarioArr.length === 0) {
      return res.status(400).json({ error: 'É necessário informar horario ou horarioId' });
    }
    const createdHorario = await prisma.horario.create({ data: { horario: JSON.stringify(horarioArr) } });
    usedHorarioId = createdHorario.id;
  }

  try {
    const interesse = await prisma.interesse.create({
      data: {
        userId: Number(userId),
        produtoId: Number(produtoId),
        localId: usedLocalId,
        horarioId: usedHorarioId,
      },
      include: {
        user: true,
        produto: {
          include: {
            user: true,
          }
        },
        local: true,
        horario: true,
      }
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
        categoria: interesse.produto.categoria,
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
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno ao registrar interesse' });
  }
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const {
    name,
    categoria,
    preco,
    condicao,
    imagem,
    descricao,
    disponibilidade,
    userId,
    localId,
    horarioId,
  } = req.body;

  const product = await prisma.produto.findUnique({ where: { id } });
  if (!product) return res.status(404).json({ error: 'Produto não encontrado' });

  const updated = await prisma.produto.update({
    where: { id },
    data: {
      name: name ?? product.name,
      categoria: categoria ?? product.categoria,
      preco: preco != null ? Number(preco) : product.preco,
      condicao: condicao ?? product.condicao,
      imagem: imagem != null ? JSON.stringify(normalizeArray(imagem) ?? []) : product.imagem,
      descricao: descricao ?? product.descricao,
      disponibilidade: disponibilidade != null ? parseBoolean(disponibilidade) : product.disponibilidade,
      userId: userId != null ? Number(userId) : product.userId,
      localId: localId != null ? Number(localId) : product.localId,
      horarioId: horarioId != null ? Number(horarioId) : product.horarioId,
    },
  });

  res.json({ ...updated, imagem: typeof updated.imagem === 'string' ? JSON.parse(updated.imagem) : updated.imagem });
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const product = await prisma.produto.findUnique({ where: { id } });
  if (!product) return res.status(404).json({ error: 'Produto não encontrado' });

  await prisma.produto.delete({ where: { id } });
  res.status(204).send();
});

export { router as productRouter };