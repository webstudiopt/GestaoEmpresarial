# Andrade Concept · Gestão

App de gestão do studio **Andrade Concept** (extensão de cílios e penteados, Santa Bárbara - MG).
Painel do mês, atendimentos, preços dos serviços, custos, reserva da licença e catálogo para WhatsApp.

- **Frontend:** React + Vite + TypeScript, CSS puro. Instalável no iPhone (PWA).
- **Dados e login:** Supabase (Postgres + Auth), direto do navegador.
- **Hospedagem:** GitHub Pages, publicado sozinho a cada push na `main`.

---

## 1. Criar o projeto no Supabase

1. Entre em <https://supabase.com>, clique em **New project**, dê um nome (ex.: `andrade-concept`), defina uma senha do banco e escolha a região **South America (São Paulo)**.
2. Espere o projeto ficar pronto.

## 2. Criar as tabelas (schema.sql)

1. No menu do Supabase, abra **SQL Editor → New query**.
2. Copie todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql), cole e clique em **Run**.

Isso cria as tabelas `servicos`, `custos`, `atendimentos`, `reservas` (cada objetivo: nome, meta e data), `reserva` (valores guardados), `historico` e `config`, todas com **RLS ativado**: cada linha tem `user_id` preenchido automaticamente e só a dona da linha pode ver, criar, alterar ou apagar.

> **Já tinha rodado o schema antes de existirem várias reservas?** Rode também [`supabase/migracao-01-varias-reservas.sql`](supabase/migracao-01-varias-reservas.sql). Ele cria a tabela `reservas` e coloca os valores já guardados numa reserva "Licença", sem perder nada. Se o app mostrar "o banco está desatualizado", é isso que falta.

## 3. Criar a usuária e desativar o cadastro público

1. **Authentication → Users → Add user → Create new user.** Informe e-mail e senha da dona e marque **Auto Confirm User**.
2. **Authentication → Sign In / Providers** (em versões antigas: *Providers → Email*): desligue **Allow new users to sign up**. Assim ninguém consegue criar conta pelo app, mesmo tendo a chave pública.

## 4. Carregar os dados iniciais (seed.sql)

1. Abra [`supabase/seed.sql`](supabase/seed.sql) e troque `COLOQUE-O-EMAIL-AQUI@exemplo.com` pelo e-mail criado no passo 3 (ou cole o UUID da usuária em `v_user`).
2. Cole no **SQL Editor** e clique em **Run**.

Entram os parâmetros (imposto, taxas, meta do mês, regras), os 13 serviços, os 20 custos fixos (R$ 9.586,98), o faturamento de abr a set/2026 e a reserva "Licença" (R$ 20.000 até 01/02/2027).

> Rodar o seed de novo **apaga e recria** serviços, custos e histórico dessa usuária. Atendimentos e reserva não são tocados.

## 5. Rodar no computador (opcional)

```bash
npm install
cp .env.example .env.local   # preencha com URL e anon key
npm run dev
```

A URL e a **anon key** ficam em **Project Settings → API** (ou **Data API**) no Supabase. A anon key é pública por natureza: quem protege os dados é o RLS.

Outros comandos:

| Comando | O que faz |
| --- | --- |
| `npm test` | Testes das fórmulas (Vitest) |
| `npm run build` | Gera a versão de produção em `dist/` |
| `npm run icones` | Recria os ícones PNG a partir do desenho em `scripts/gerar-icones.mjs` |

## 6. Publicar no GitHub Pages

1. No repositório do GitHub: **Settings → Secrets and variables → Actions → aba Variables → New repository variable**. Crie:
   - `VITE_SUPABASE_URL` = URL do projeto (ex.: `https://abcd1234.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY` = a anon key
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. Faça push na `main`. O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) roda os testes, gera o build com as variáveis e publica. Acompanhe na aba **Actions**.
4. O endereço fica `https://<usuario>.github.io/<nome-do-repositorio>/` (aqui: `https://webstudiopt.github.io/GestaoEmpresarial/`).

O caminho base (`/<nome-do-repositorio>/`) é definido sozinho pelo workflow. A navegação usa `#/aba`, então recarregar a página nunca dá 404.

### Liberar o endereço no Supabase

Em **Authentication → URL Configuration**, coloque o endereço do Pages em **Site URL**. O login por senha funciona mesmo sem isso, mas deixa e-mails de recuperação apontando para o lugar certo.

## 7. Google Agenda (opcional)

Em **Atendimentos**, o app pode ler os horários marcados na Google Agenda e mostrar os que ainda não foram registrados. O título do evento precisa ter **nome da cliente + serviço**, em qualquer ordem:

| Título do evento | Cliente | Serviço |
| --- | --- | --- |
| `Ana - Soft Hyper` | Ana | Soft Hyper |
| `Soft Hyper + Beatriz` | Beatriz | Soft Hyper |
| `Carla \| manutenção soft` | Carla | Manutenção Soft |
| `Daniela lash lifting` | Daniela | Lash Lifting |

Acento e maiúsculas não importam. Dá para abreviar quando não houver dúvida (`soft` vira Soft Hyper). Tocar em **Registrar** preenche o formulário (data, cliente, serviço e valor). Ela confere o pagamento e confirma. Nada é gravado sozinho. Eventos de dia inteiro e cancelados ficam de fora. O app só **lê** a agenda, nunca altera.

### Configurar (uma vez)

1. Entre em <https://console.cloud.google.com> com a conta Google da agenda e crie um projeto (ex.: `andrade-concept`).
2. **APIs e serviços → Biblioteca →** procure **Google Calendar API → Ativar**.
3. **APIs e serviços → Tela de consentimento OAuth** (ou *Google Auth Platform*):
   - Tipo **Externo**, nome do app `Andrade Concept`, e-mail de suporte.
   - Escopo: `.../auth/calendar.readonly`.
   - Em **Usuários de teste**, adicione o e-mail da conta Google da agenda. O app pode ficar em modo *Teste* para sempre (só ela usa).
4. **Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web.** Em **Origens JavaScript autorizadas**, adicione:
   - `http://localhost:5173`
   - `https://webstudiopt.github.io`
5. Copie o **ID do cliente** (termina em `.apps.googleusercontent.com`) e coloque:
   - no `.env.local`: `VITE_GOOGLE_CLIENT_ID=...`
   - no GitHub: **Settings → Secrets and variables → Actions → Variables →** `VITE_GOOGLE_CLIENT_ID`

Sem essa variável, a parte do Google simplesmente não aparece.

### No uso

- Na primeira vez, o Google mostra o aviso **"O Google não verificou este app"**. É normal no modo Teste: toque em **Avançado → Acessar Andrade Concept (não seguro)** e permita a leitura da agenda.
- Por segurança, a conexão vale **1 hora**. Depois aparece **Reconectar**, que pede só um toque.
- Se houver mais de uma agenda (ex.: uma só do studio), escolha qual usar no seletor que aparece ao lado de **Atualizar**.

## 8. Instalar no iPhone

1. Abra o endereço do app no **Safari** e faça login.
2. Toque em **Compartilhar** (quadrado com seta) → **Adicionar à Tela de Início** → **Adicionar**.
3. O app abre em tela cheia, com o ícone "AC". A sessão fica salva, sem precisar entrar toda vez.

Quando sai versão nova, o app se atualiza sozinho na próxima abertura.

---

## Como as contas são feitas

As fórmulas ficam em [`src/lib/calc.ts`](src/lib/calc.ts), testadas em [`src/lib/calc.test.ts`](src/lib/calc.test.ts).

```
fixos_total  = soma dos custos fixos
hora_custo   = fixos_total / horas_mes
taxa_media   = taxa_cartao * 0.15          (só ~15% das vendas passam no cartão)

Por serviço
custo_real   = (minutos/60) * hora_custo + material
minimo       = custo_real / (1 - imposto - taxa_media - lucro_alvo)
lucro        = preco * (1 - imposto - taxa_media) - custo_real
selo         = "Dá prejuízo" se preco < custo_real / (1 - imposto)
               "Abaixo do mínimo" se preco < minimo
               senão "Saudável"

Por mês
sobra        = faturamento - imposto - taxas de cartão (crédito e débito) - material - fixos_total
```

Detalhes:

- **Atendimentos guardam uma cópia** do nome, tempo e material do serviço no momento do registro. Mudar o preço ou o tempo do serviço depois não altera o passado. Ao editar um atendimento e trocar o serviço, a cópia é refeita com o serviço novo.
- **Gráfico do Painel:** mês com atendimentos registrados usa a soma deles; mês sem atendimentos usa o "Faturamento antes do app" (editável no fim da aba Custos).
- **"Faltam R$ X: cerca de N atendimentos":** usa o ticket médio do mês. Se ainda não há atendimentos no mês, usa a média dos preços do catálogo.
- **Reservas:** cada uma tem meta e data própria. A parcela do mês = o que faltava no começo do mês ÷ meses até a data. Guardou a mais, as próximas diminuem; guardou a menos, aumentam quando o mês vira.

## Estrutura

```
src/
  lib/          calc.ts (fórmulas), catalogo.ts (texto do WhatsApp), format.ts, types.ts, supabase.ts
  data/         Dados.tsx (carrega e grava no Supabase), Toast.tsx (avisos)
  components/   ui.tsx (campos, botão de excluir com confirmação, selos), Icones.tsx
  screens/      Login, Painel, Atendimentos, Servicos, Custos, Reserva, Catalogo
  styles/       tokens.css (cores claro/escuro), app.css
supabase/       schema.sql, seed.sql
```
