# 📊 Painel SAC — Indicadores de Atendimento

Painel (dashboard) operacional para acompanhamento de indicadores de atendimento ao cliente, consolidando dados do **Jira** (chamados/tickets) e do **Multi360** (atendimentos via chat). Desenvolvido em HTML, CSS e JavaScript puros, com gráficos desenhados diretamente em `<canvas>`, sem bibliotecas externas — funciona totalmente offline.

## ✨ Funcionalidades

- **KPIs em destaque**: cartões com os principais números do período (chamados abertos, taxa de conclusão, tempo médio de resolução, atendimentos via chat e satisfação média).
- **Gráficos nativos em `<canvas>`** (sem dependências):
  - Donut chart de status e de classificação de prioridade dos chamados Jira.
  - Gráfico de barras horizontais para chamados por cliente e motivo de contato.
  - Gráfico de barras verticais para distribuição de notas de satisfação.
- **Tabelas detalhadas** com listagem de chamados (Jira) e atendimentos (Multi360), incluindo:
  - Filtros dinâmicos por cliente, tipo, prioridade, motivo e nota.
  - "Pills" coloridas indicando status e classificação/prioridade.
  - Animação de entrada das linhas ao renderizar.
- **Responsivo**: layout em grid que se adapta a telas menores, com breakpoints para tablets e celulares.
- **Alto contraste e legibilidade**: identidade visual baseada no sistema apLIS (paleta azul-marinho e dourado).
- **Renderização otimizada para HiDPI**: os gráficos em canvas são redesenhados automaticamente ao redimensionar a janela (com debounce).

## 🛠️ Tecnologias

- **HTML5**
- **CSS3** (variáveis CSS, grid/flexbox, animações `@keyframes`)
- **JavaScript** (Vanilla JS — manipulação de canvas, DOM e filtros, sem frameworks)
- **Google Fonts**: [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk), [Inter](https://fonts.google.com/specimen/Inter) e [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)

## 📁 Estrutura do projeto

```
.
├── index.html    # Estrutura do painel (KPIs, gráficos e tabelas)
├── styles.css    # Estilos, variáveis de cor, layout e responsividade
├── script.js     # Lógica de cálculo de KPIs, renderização dos gráficos e filtros
└── data.js       # Fonte dos dados (jiraData, multiData) — não incluso neste repositório
```

> ⚠️ **Atenção:** o `index.html` referencia um arquivo `data.js`, carregado antes do `script.js`, que deve expor os arrays `jiraData` e `multiData` com os registros de chamados e atendimentos do período. Esse arquivo contém os dados operacionais e deve ser gerado/atualizado a cada novo relatório (veja a seção [Formato dos dados](#-formato-dos-dados)).

## 🚀 Como usar

Por ser um projeto estático (sem build ou dependências), basta:

1. Clonar o repositório:
   ```bash
  https://johnnjonathansantos-arch.github.io/Dashboard-produtividade/
   ```
2. Garantir que exista um arquivo `data.js` na raiz do projeto com os dados do período (ver seção abaixo).
3. Abrir o arquivo `index.html` diretamente no navegador, ou servir a pasta com um servidor local, por exemplo:
   ```bash
   npx serve .
   ```
   ou, com Python:
   ```bash
   python3 -m http.server
   ```

## 📐 Formato dos dados

O `script.js` espera que `data.js` declare dois arrays globais:

- **`jiraData`**: lista de chamados, com campos como `ticket`, `titulo`, `tipo`, `cliente`, `status`, `classe` (prioridade), `tempo` e `criado` (data no formato `dd/mm/aaaa hh:mm`).
- **`multiData`**: lista de atendimentos via chat, com campos como `protocolo`, `nome` (no formato `"Cliente - Contato"`), `motivo`, `data` (formato `dd/mm/aaaa hh:mm`) e `avaliacao` (nota de satisfação, podendo ser `null`).

## ⚙️ Personalização

- **`styles.css`**: paleta de cores no bloco `:root` (variáveis `--brand`, `--amber`, `--teal`, `--rose`, etc.) para adaptar a identidade visual.
- **`index.html`**: título do painel, responsável e período exibidos no cabeçalho (`topbar`).
- **`script.js`**: lógica de cálculo dos KPIs e regras de classificação (ex: `statusPillClass`, `classePillClass`).

## 📄 Licença

Projeto de uso interno para geração de relatórios de atendimento. Adapte livremente conforme a necessidade da sua operação.
