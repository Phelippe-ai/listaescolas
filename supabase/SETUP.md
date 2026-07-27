# Ligar o banco de dados na nuvem (Supabase)

Isto faz a plataforma sair do modo "cada aparelho isolado" para uma **base
compartilhada em tempo real**, com **login** e **histórico de atividades**.
São ~5 minutos, feitos uma única vez.

## Passo 1 — Criar o projeto (grátis)
1. Acesse **https://supabase.com** e faça login (pode ser com o GitHub).
2. Clique em **New project**.
3. Dê um nome (ex.: `fala-tio-prospeccao`), defina uma senha de banco
   (guarde-a) e escolha a região **South America (São Paulo)**.
4. Aguarde ~2 min até o projeto ficar pronto.

## Passo 2 — Criar as tabelas
1. No projeto, abra **SQL Editor** (menu lateral) → **New query**.
2. Abra o arquivo [`schema.sql`](./schema.sql) deste repositório, **copie todo
   o conteúdo**, cole no editor e clique em **Run**.
3. Deve aparecer "Success". (Se aparecer um aviso "already member of publication",
   pode ignorar — é normal.)

## Passo 3 — Criar os usuários do time
1. Vá em **Authentication → Users → Add user → Create new user**.
2. Preencha **email** e **senha** de cada pessoa que vai usar (você, sócio…).
   Marque **Auto Confirm User** para já poderem entrar.
3. Repita para cada pessoa do time.

> Cada um vai entrar na plataforma com esse email e senha. É o que mantém os
> contatos das escolas protegidos.

## Passo 4 — Me enviar as 2 chaves de conexão
1. Vá em **Project Settings** (engrenagem) → **API**.
2. Copie e me mande aqui:
   - **Project URL** (algo como `https://abcdefgh.supabase.co`)
   - **anon public** (a chave longa marcada como *anon* / *public*)

> 🔒 **Pode mandar sem medo:** essas duas são chaves *públicas*, feitas para ficar
> no site. Quem protege os dados é o login + as regras de segurança (RLS) que já
> estão no `schema.sql`. **NÃO** me envie a chave *service_role* nem a senha do
> banco — essas são secretas.

## Passo 5 — Eu conecto o site
Com essas 2 chaves, eu ligo a plataforma ao seu banco:
- tela de login,
- base compartilhada entre todos os aparelhos,
- sincronização em tempo real (Kanban, novas escolas, edições),
- histórico de atividades ("Fulano moveu Colégio X → Reunião agendada").

Os dados-semente das 97 escolas são carregados no banco automaticamente na
primeira vez, e a partir daí tudo fica salvo na nuvem.
