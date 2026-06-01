import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { productRouter } from './routes/product';
import { userRouter } from './routes/user';
import { prisma } from './prisma';

dotenv.config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(cors());
app.use(express.json());
app.use('/produtos', productRouter);
app.use('/', userRouter);

app.get('/', (req, res) => {
  res.json({ message: 'Backend Prisma rodando', version: '1.0.0' });
});

app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno no servidor' });
});

const server = app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

const shutdown = async () => {
  console.log('Shutting down server...');
  await prisma.$disconnect();
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
