# Fala Tio · Prospecção de Escolas

Plataforma web para gerir a **prospecção ativa** de escolas: uma lista interativa
de contatos (escola, decisor, telefones e endereço) e um **funil Kanban** para
acompanhar cada lead do primeiro contato até o fechamento.

Feita com HTML, CSS e JavaScript puro — **sem instalação, sem servidor e sem
banco de dados**. Basta abrir no navegador. Todas as suas edições ficam salvas
automaticamente no próprio navegador (`localStorage`).

## Como usar

Abra o arquivo `index.html` no navegador (duplo clique) ou publique numa URL
(veja abaixo). Não precisa de nada instalado.

### Aba **Lista**
- **Busca** por nome da escola, decisor ou bairro.
- **Filtros** por **estado (UF)**, **cidade**, **ensino médio**, etapa do funil e
  perfil de inovação. Ao escolher um estado, a lista de cidades se ajusta
  automaticamente àquele estado.
- **🦅 Ceará primeiro** — quando ligado (padrão), mantém as escolas do Ceará
  sempre no topo, independentemente da ordenação escolhida.
- Coluna **Médio** mostra se a escola tem ensino médio (Sim/Não) — a UF aparece
  como etiqueta ao lado da cidade.
- **Ordenação** clicando nos cabeçalhos (escola, alunos, médio, score, etapa…).
- Botões de **ligar** (☎) e **WhatsApp** (💬) direto em cada telefone.
- Mude a **etapa** de qualquer escola pelo seletor colorido da linha.
- Clique no nome da escola (ou no lápis) para **ver/editar** todos os dados e
  registrar **notas da prospecção** (histórico de contatos).
- **＋ Nova escola** para cadastrar um lead do zero.

### Aba **Funil (Kanban)**
Arraste os cards entre as colunas para atualizar a etapa de cada escola:

1. **Escola identificada**
2. **Primeiro contato**
3. **Contato com a coordenação**
4. **Reunião c/ coordenação agendada**
5. **Reunião c/ coordenação realizada**
6. **Encaminhado para a direção**
7. **Contato com a direção**
8. **Reunião c/ direção agendada**
9. **Reunião c/ direção realizada**
10. **Contrato enviado**
11. **Contrato em análise**
12. **Contrato assinado**
13. **Projeto piloto**

### Menu **Dados** — importar e exportar planilhas
- **Importar planilha (CSV / JSON)** — traz escolas de uma planilha direto para
  a base. O sistema **reconhece as colunas automaticamente**, aceitando nomes
  variados (ex.: *Escola*, *Nome da escola*, *Colégio*; *Telefone*, *Contato*;
  *Decisor*, *Diretor*, *Responsável*; *Celular*, *WhatsApp* etc.). Na
  importação você escolhe **Adicionar** à lista atual (ignora escolas repetidas
  pelo nome) ou **Substituir** tudo.
- **Baixar modelo de planilha** — um CSV de exemplo com todas as colunas certas,
  pronto para você preencher no Excel / Google Sheets e importar.
- **Exportar planilha (CSV)** — baixa toda a base em CSV (abre no Excel / Google
  Sheets). Pode reimportar depois: o formato faz o ciclo completo.
- **Exportar backup (JSON)** — cópia de segurança fiel de todos os dados.
- **Alternar tema** — claro/escuro.
- **Restaurar dados originais** — volta à lista-semente da pesquisa.

> **Como levar uma planilha do Excel para a plataforma:** no Excel/Google Sheets,
> vá em *Arquivo → Salvar como / Fazer download* e escolha **CSV**. Depois use
> *Importar planilha*. (O modelo acima já mostra as colunas esperadas.)

#### Colunas reconhecidas na importação
`nome`, `cidade`, `estado (UF)`, `bairro`, `endereço`, `telefone da escola`,
`site`, `alunos`, `decisor (nome)`, `cargo`, `telefone direto`, `inovação`,
`score`, `nota ENEM`, `etapa`, `observações`, `notas`. Só o **nome** é
obrigatório; o resto é opcional. Colunas não reconhecidas são simplesmente
ignoradas (a plataforma avisa quais).

## Publicar online (GitHub Pages)

Como é um site estático, dá para publicar de graça:

1. No GitHub, vá em **Settings → Pages**.
2. Em *Build and deployment*, selecione a branch deste projeto e a pasta `/root`.
3. Salve. Em alguns minutos o site fica disponível numa URL pública.

## Estrutura

```
index.html        Estrutura da página
css/styles.css    Estilos (tema claro/escuro)
js/data.js        Dados-semente (97 escolas da pesquisa)
js/app.js         Toda a lógica (lista, kanban, edição, persistência)
```

> Observação: os dados-semente vieram da pesquisa de prospecção. Alguns telefones
> diretos e endereços eram estimativas na pesquisa original — confirme os contatos
> ao iniciar a abordagem e atualize direto na plataforma.
