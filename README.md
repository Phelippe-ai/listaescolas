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
- **Filtros** por cidade, etapa do funil e perfil de inovação.
- **Ordenação** clicando nos cabeçalhos (escola, alunos, score, etapa…).
- Botões de **ligar** (☎) e **WhatsApp** (💬) direto em cada telefone.
- Mude a **etapa** de qualquer escola pelo seletor colorido da linha.
- Clique no nome da escola (ou no lápis) para **ver/editar** todos os dados e
  registrar **notas da prospecção** (histórico de contatos).
- **＋ Nova escola** para cadastrar um lead do zero.

### Aba **Funil (Kanban)**
Arraste os cards entre as colunas para atualizar a etapa de cada escola:

1. **Contato pendente** — ainda não iniciado
2. **Tentativa de contato**
3. **Falei com o decisor**
4. **Reunião agendada**
5. **Reunião c/ coordenação**
6. **Fechado ✓**
7. **Sem interesse**

### Menu **Dados**
- **Exportar (JSON)** / **Importar (JSON)** — backup completo dos seus dados.
- **Exportar CSV** — abre no Excel / Google Sheets.
- **Alternar tema** — claro/escuro.
- **Restaurar dados originais** — volta à lista-semente da pesquisa.

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
