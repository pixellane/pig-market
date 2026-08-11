# Pig Market

Full-stack Meat Shop / Pork Meat Ordering System.

## Local setup

1. Start PostgreSQL:

```bash
docker-compose up -d postgres
```

2. Configure backend `.env` from `.env.example`.

3. Install dependencies:

```bash
cd pig-market/backend
npm install
```

4. Run the backend:

```bash
npm run dev
```

5. Run frontends separately:

```bash
cd pig-market/customer
npm install
npm run dev
```

```bash
cd pig-market/admin
npm install
npm run dev
```

## Services

- PostgreSQL: database
- Express API: backend (product images stored in `backend/uploads/products`)
- Customer app: customer
- Admin app: admin
