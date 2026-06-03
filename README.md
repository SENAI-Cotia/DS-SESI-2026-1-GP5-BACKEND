# DS SEF 2026 Backend

Backend Express + Prisma para o projeto.

## Instalação

1. `npm install`
2. `npx prisma generate`
3. `npx prisma db push`
4. `npm run dev`

## Endpoints de produto

- `POST /products` - cria um produto
- `GET /products` - lista todos os produtos
- `GET /products/:id` - busca produto por id
- `PUT /products/:id` - edita um produto
- `DELETE /products/:id` - exclui um produto

### Dados esperados para criação/edição

```json
{
  "name": "Nome do produto",
  "preco": 123.45,
  "condicao": "novo",
  "imagem": "https://...",
  "descricao": "Descrição do produto",
  "disponibilidade": true,
  "userId": 1,
  "localId": 1,
  "horarioId": 1
}
```
