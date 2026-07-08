# Bosch Car Service Lousã — Gestão de Oficina

Plataforma interna de gestão da oficina que substitui o tradicional **Mapa de
Férias** em papel por um sistema digital, e cresce para gerir disponibilidade da
equipa, marcações, clientes, veículos e tarefas.

Interface em **Português (Portugal)**. Design desktop-first, responsivo para
tablet e telemóvel.

## ✨ Funcionalidades

### Mapa de Férias (funcionalidade principal)

- Vista anual (12 meses × 31 dias) tal como o mapa em papel.
- Cada colaborador tem uma **cor única**; legenda sempre visível.
- **Células divididas em bandas de cor** quando vários colaboradores estão de
  férias no mesmo dia (ex.: 3 de Agosto mostra 3 bandas).
- _Tooltip_ em cada dia com os nomes dos ausentes; clique abre o detalhe do dia.
- Fins-de-semana sombreados e dias inválidos (30/31) assinalados.
- Pedidos **pendentes** aparecem com tracejado; marcador vermelho nos dias de
  conflito de equipa.
- Filtros por colaborador e por mês; navegação por ano.
- **Exportar Excel (CSV)** e **Imprimir** com layout tipo mapa de papel.
- Regra de **equipa mínima** por dia com avisos de conflito.

### Restantes módulos

- **Pedidos de Férias** — submissão e fluxo de aprovação (aprovar/rejeitar) com
  aviso quando um pedido deixa a equipa abaixo do mínimo.
- **Colaboradores** — CRUD, cor no mapa, dias de férias usados/ano.
- **Oficina / Agenda** — marcações por dia; impede atribuir um mecânico que
  esteja de férias nessa data.
- **Clientes** e **Veículos** — CRM simples com pesquisa por nome, telefone,
  matrícula ou modelo.
- **Tarefas** — quadro (To Do / Em curso / Concluída) com prioridade e ligação a
  colaborador/veículo.
- **Relatórios** — férias por colaborador, ausências por mês, marcações por
  estado e conflitos de equipa; exportação CSV / impressão.
- **Início (Dashboard)** — disponibilidade de hoje, próximas férias, marcações
  do dia, pedidos pendentes, alertas e ações rápidas.
- **Definições** — nome da oficina, ano do mapa, mínimo de equipa e perfis de
  acesso.

## 👥 Perfis de acesso

| Perfil                     | Permissões                                                                  |
| -------------------------- | --------------------------------------------------------------------------- |
| **Administrador / Gestor** | Acesso total; gere equipa, aprova férias, relatórios.                       |
| **Receção**                | Gere marcações, clientes e veículos; vê disponibilidade; não aprova férias. |
| **Colaborador**            | Vê e submete as suas próprias férias; vê tarefas atribuídas.                |

## 🚀 Stack técnica

- **Next.js 14** (App Router) + **TypeScript**
- **PostgreSQL** (Neon) via **Prisma ORM**
- **Auth.js (NextAuth)** com credenciais e permissões por perfil
- **Server Actions** para mutações + **Server Components** para leitura
- **Tailwind CSS** + componentes shadcn/ui
- Identidade visual Bosch Car Service (vermelho / cinza / preto)

## 🏁 Começar

```bash
pnpm install

# Variáveis de ambiente (ver .env.example)
#   DATABASE_URL / DATABASE_URL_UNPOOLED (PostgreSQL / Neon)
#   AUTH_SECRET

pnpm db:push     # sincroniza o esquema com a base de dados
pnpm db:seed     # dados de exemplo (colaboradores + férias do brief)
pnpm dev         # http://localhost:3000
```

> **Base de dados local sem servidor?** O esquema é portável. Para SQLite,
> mude `provider = "sqlite"` em `prisma/schema.prisma` e
> `DATABASE_URL="file:./dev.db"`. Todos os enums são guardados como texto, por
> isso o esquema funciona igual em SQLite e PostgreSQL.

### Contas de demonstração (após o seed)

| Perfil         | Email                    | Palavra-passe |
| -------------- | ------------------------ | ------------- |
| Gestor (Admin) | `gestor@bosch-lousa.pt`  | `bosch2026`   |
| Receção        | `rececao@bosch-lousa.pt` | `bosch2026`   |
| Colaborador    | `rodrigo@bosch-lousa.pt` | `bosch2026`   |

## 📦 Modelo de dados

`Employee`, `Vacation`, `Customer`, `Vehicle`, `Appointment`, `Task`,
`WorkshopSettings`, `User` (com `role`). Ver [`prisma/schema.prisma`](prisma/schema.prisma).

## 📁 Estrutura

```
app/
  auth/login/            # início de sessão
  dashboard/             # layout + páginas (ferias, pedidos, colaboradores, …)
components/              # UI partilhada (shadcn/ui, brand, badges, stat-card)
features/                # módulos (ferias, pedidos, colaboradores, oficina, …)
lib/
  actions.ts             # Server Actions (mutações, com verificação de perfil)
  data.ts                # leituras (Server Components)
  holidays.ts            # ocupação por dia, células divididas, conflitos
  dates.ts               # utilitários de data (UTC, formatos PT)
  constants.ts           # value-sets e etiquetas em Português
  schemas.ts             # validação Zod
prisma/                  # esquema + seed
```

## 📜 Scripts

| Comando          | Descrição                   |
| ---------------- | --------------------------- |
| `pnpm dev`       | Servidor de desenvolvimento |
| `pnpm build`     | Build de produção           |
| `pnpm db:push`   | Sincronizar esquema         |
| `pnpm db:seed`   | Semear dados de exemplo     |
| `pnpm db:studio` | Prisma Studio               |
| `pnpm typecheck` | Verificação de tipos        |
| `pnpm lint`      | ESLint                      |

## 🗺️ Próximos passos (preparado para SaaS)

- Notificações reais de aprovação (email/push).
- _Multi-tenant_ (várias oficinas) sobre `WorkshopSettings`.
- Meio-dia de férias no cálculo de dias (o tipo já existe no modelo).
- Upload de documentos/fotografias em veículos.
- Exportação PDF nativa (para além de imprimir).
