# 🥊 Rinq.app

Plataforma mobile de apostas com **moeda virtual fictícia** e **temporadas sazonais**: o mesmo
backend e o mesmo banco atendem duas realidades diferentes, e o app troca paleta, tipografia e
dicionário de termos via **EAS Update (OTA)** — sem gerar APK novo.

| Temporada | `seasonType` | Interface | Vocabulário |
|---|---|---|---|
| 1 — MMA Humano | `HUMAN_MMA` | escura / vermelha | Lutador, Academia, Categoria, Cartel |
| 2 — Galos-Robô | `ROBOT_ROOSTER` | industrial / neon | Galo-Robô, Laboratório, Armamento, Danos de Batalha |

```
rinq-app/
├── backend/    API REST MVC — Fastify + Prisma 7 + PostgreSQL
├── mobile/     App React Native — Expo SDK 54 + expo-updates
├── admin/      Painel web React + Vite para administradores
└── docker-compose.yml
```

---

## ✅ Pré-requisitos

- **Node.js 20.19+** (testado no 24)
- **Docker** (para o PostgreSQL) — ou um Postgres próprio
- App **Expo Go** no celular, ou emulador Android / simulador iOS

---

## 🚀 Rodando o projeto (4 passos)

### 1. Suba o banco

Na raiz do projeto:

```bash
docker compose up -d
```

Isso cria um PostgreSQL em `localhost:5432` (usuário `rinq`, senha `rinq`, banco `rinq`).

### 2. Prepare o backend

```bash
cd backend
npm install
cp .env.example .env        # já vem apontando para o banco do docker
npx prisma migrate dev      # cria as tabelas
npm run db:generate         # gera o cliente Prisma usado pela API
npm run db:seed             # 3 players + 1 admin + 16 competidores + 8 lutas
npm run dev                 # API em http://localhost:3333
```

Deve aparecer no terminal: `Rinq API no ar — temporada ativa: HUMAN_MMA`.
Teste rápido: <http://localhost:3333/health>

### 3. Rode o app

Em **outro terminal**:

```bash
cd mobile
npm install
npm start                   # abre o Expo — escaneie o QR Code com o Expo Go
```

> **Não precisa configurar IP.** O app descobre o endereço do backend a partir do
> host do Metro. Se precisar forçar, crie `mobile/.env` com:
> `EXPO_PUBLIC_API_URL=http://192.168.0.10:3333`

### 4. Use o app

1. Crie uma conta `PLAYER` ou entre com uma conta existente.
2. O app lê `GET /season` e monta o tema da temporada ativa.
3. Toque em uma **odd** para abrir a folha de aposta, escolha o valor e confirme.
4. O saldo desconta na hora (débito atômico no backend).
5. Toque no **selo da temporada** (topo direito) para pré-visualizar a outra temporada —
   o app inteiro troca de cara e de vocabulário na hora.

### 5. Rode o painel administrativo

Com o backend rodando, em outro terminal:

```bash
cd admin
npm install
npm run dev
```

Acesse <http://localhost:5173/> e entre com a conta `ADMIN` criada pelo seed:

```text
E-mail: admin@rinq.app
Senha: admin12345
```

O painel permite consultar apostas, acompanhar o card, cadastrar competidores,
criar lutas e registrar resultados. A API continua responsável pelas odds e pela
liquidação atômica das apostas.

---

## 🔁 Trocando a temporada

### No servidor (dados + tema padrão)

Edite `backend/.env` e reinicie a API:

```env
ACTIVE_SEASON=ROBOT_ROOSTER
SEASON_LABEL="Temporada 2 — Cyber Cockfights"
EAS_CHANNEL=season-robot
```

O app passa a receber `ROBOT_ROOSTER` em `GET /season`, troca de tema e passa a listar
as lutas de robôs. **Nenhuma migração de banco é necessária.**

### No app publicado (OTA de verdade)

Uma vez só, para ligar o projeto ao EAS:

```bash
cd mobile
npm install -g eas-cli
eas login
eas init                    # cria o projeto e grava extra.eas.projectId
eas update:configure        # grava updates.url no app.json
eas build --profile production --platform android   # gera o APK/AAB (uma vez)
```

Depois, a cada temporada — só JavaScript, sem build nova:

```bash
npm run ota:publish:robot   # eas update --branch season-robot
npm run ota:switch:robot    # aponta o canal production para essa branch
```

Para voltar: `npm run ota:switch:mma`.
O app checa atualização no boot e ao voltar do background (`src/hooks/useOtaUpdates.ts`)
e mostra um banner "Nova temporada disponível" com o botão **Aplicar**.

---
 ## Para testes do sistema foram criados alguns usuarios padrao

 Admin:
admin@rinq.app
admin12345

Players:
demo@rinq.app
marina@rinq.app
teo@rinq.app

Senha dos players: player123

## 📡 Endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Status da API |
| GET | `/season` | Temporada ativa (dirige o tema do app) — RF06 |
| POST | `/auth/register` | Cadastro público; sempre cria `PLAYER` |
| POST | `/auth/login` | Login de `PLAYER` ou `ADMIN`; devolve JWT |
| GET | `/auth/me` | Usuário autenticado |
| GET | `/users/me/bets` | Apostas do player autenticado |
| GET | `/admin/bets` | Todas as apostas; somente `ADMIN` |
| GET | `/competitors?season=` | Catálogo de competidores — RF02 |
| GET | `/competitors/:id` | Detalhe do competidor |
| POST | `/competitors` | Cadastro de competidor; somente `ADMIN` |
| GET | `/fights?season=&includeFinished=&take=` | Card de lutas — RF03 |
| GET | `/fights/:id` | Detalhe da luta |
| GET | `/fights/odds/preview?competitorAId=&competitorBId=` | Simulação de odds — RF04 |
| POST | `/fights` | Cria confronto; somente `ADMIN` |
| POST | `/fights/:id/finish` | Encerra e liquida; somente `ADMIN` |
| POST | `/bets` | Efetiva aposta; somente `PLAYER` — RF05 |
| GET | `/bets/:id` | Detalhe da própria aposta ou acesso `ADMIN` |

### Papéis e permissões

- `PLAYER`: consultar temporada, competidores e lutas; criar apostas; consultar apenas suas apostas.
- `ADMIN`: cadastrar competidores, criar e encerrar lutas, consultar apostas e operar o painel administrativo.
- O cadastro público nunca aceita `role`; uma conta só pode virar `ADMIN` por seed ou operação administrativa protegida.
- O `userId` não é aceito para efetivar aposta: ele é obtido do JWT autenticado.

Exemplos:

```bash
# apostar
curl -X POST localhost:3333/bets -H 'Content-Type: application/json' -d '{
  "userId": "<id>", "fightId": "<id>", "chosenWinnerId": "<id>", "amount": 200
}'

# encerrar a luta (sem winnerId = empate, estorna tudo)
curl -X POST localhost:3333/fights/<id>/finish \
  -H 'Content-Type: application/json' -d '{"winnerId":"<id>"}'
```

---

## 🧮 Como as odds são calculadas (`OddsService`)

```
força   = (V + 0,5·E + 1) / (total + 2)      ← suavização de Laplace
prob.   = força_A / (força_A + força_B)      ← normalização, clamp em [5%, 95%]
odd     = 1 / (prob · 1,10)                  ← margem da casa de 10%
piso    = 1,05                               ← odd mínima
```

Exemplo real do seed: cartel `14-3-1` vs `10-6-0` → odds **1.63** e **2.06**
(margem implícita de 9,9%). As odds são **congeladas** na criação do card e
gravadas na aposta (`oddAtPlacement`), então mudanças posteriores não alteram
bilhetes já emitidos.

---

## 🗂️ Arquitetura MVC (backend)

```
backend/src/
├── controllers/   ciclo HTTP: valida (zod), orquestra, responde
├── models/        persistência via Prisma + transações
├── views/         serializadores JSON (DTOs)
├── services/      regra de negócio pura (OddsService)
├── config/env.ts  temporada ativa e variáveis
├── lib/           client Prisma, erros de domínio, validação
└── server.ts      rotas + tratamento de erros
```

Regras que valem a pena conhecer:

- **Atomicidade (RNF02):** apostar debita a carteira com a checagem de saldo dentro do
  `WHERE` (`updateMany`), dentro de `prisma.$transaction`. Testado com 10 apostas
  simultâneas de 200 moedas em um saldo de 1500 → 7 aceitas, 3 recusadas, saldo final 100.
- **Encerrar luta** atualiza cartel dos dois competidores **e** liquida todas as apostas na
  mesma transação. Empate (`winnerId` nulo) estorna todos os valores (`VOID`).
- **Schema agnóstico:** `specWeight` e `specStyle` são "Categoria/Estilo" no MMA e
  "Classe de Chassi/Armamento" nos robôs — quem dá o nome é o dicionário do app.

## 🎨 Camada de tema (mobile)

```
mobile/src/
├── theme/            types.ts · mmaTheme.ts · robotTheme.ts · index.tsx (ThemeProvider)
├── api/client.ts     fetch tipado + DTOs espelhando as Views
├── hooks/            useOtaUpdates.ts (EAS Update)
├── components/       FightCard · BetSheet · UpdateBanner
├── screens/          HomeScreen
└── App.tsx
```

Nenhum componente tem cor ou texto fixo: tudo vem de `useSeasonTheme()`
(`theme.palette`, `theme.typography`, `theme.dictionary`).

---

## 🛠️ Scripts úteis

**backend/**

| Comando | O que faz |
|---|---|
| `npm run dev` | API com reload |
| `npm run typecheck` | TypeScript estrito |
| `npm run db:seed` | Repopula as duas temporadas |
| `npm run db:reset` | Zera o banco e roda migrações + seed |
| `npm run db:studio` | Prisma Studio (GUI do banco) |

**mobile/**

| Comando | O que faz |
|---|---|
| `npm start` | Expo dev server |
| `npm run typecheck` | TypeScript estrito |
| `npm run ota:publish:mma` \| `:robot` | Publica bundle da temporada |
| `npm run ota:switch:mma` \| `:robot` | Aponta o canal para a temporada |

---

## 🧯 Problemas comuns

| Sintoma | Solução |
|---|---|
| App mostra "Não foi possível falar com a API" | O backend está rodando? Celular na mesma Wi-Fi? Use `EXPO_PUBLIC_API_URL` |
| `Can't reach database server` | `docker compose up -d` e confira o `DATABASE_URL` do `.env` |
| `Usuário demo (rode o seed)` | Rode `npm run db:seed` no backend |
| Odds/lutas vazias após trocar `ACTIVE_SEASON` | Reinicie a API (o `.env` é lido no boot) |
| OTA não faz nada em dev | Esperado: `expo-updates` só opera em build de release (`Updates.isEnabled === false` no Expo Go) |

> ⚠️ As moedas são **fictícias**. Não há dinheiro real, depósito ou saque em nenhum ponto do sistema.
