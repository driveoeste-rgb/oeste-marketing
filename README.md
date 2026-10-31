# Oeste Marketing — Portal de Arquivos (versão 6.0 — correção da API)

Interface responsiva para acessar o repositório de marketing no Google Drive.

## Novidades da versão 6.0
- Corrigida a verificação de acesso a pastas que causava `{"error":"Pasta não acessível."}`.
- Adicionada navegação com validação de caminho (`path`) sem expor a chave da API.
- O erro exibido na tela agora é mais específico, preservando o acesso pelo Drive como alternativa.
- Mantidos todos os oito botões, imagens e seletor minimalista.

## Novidades
- Seletor minimalista à esquerda: ícone de **lista** ou **grade** (como a referência enviada).
- Alternância entre botões grandes em coluna e blocos em duas colunas (em telas suficientemente largas).
- Preferência salva no navegador; dentro das pastas o modo também se aplica às listagens.
- Logo centralizada entre cabeçalho e conteúdo, sem ser recortada ou atrapalhar os botões.
- Todos os oito botões com o mesmo estilo: OFERTAS, COMUNICADOS, FERIADOS, SPECSHEETS, VÍDEOS, FEIRÕES, FOTO DE PERFIL e LOGO OESTE.
- A categoria LOGO OESTE foi conferida no Drive e adicionada, incluindo seus oito arquivos PNG e a subpasta RODAPÉ, com mais três arquivos PNG. Essas entradas verificadas também aparecem no modo de contingência sem a API.

## Estrutura pronta para Cloudflare Pages

```text
oeste-portal/
├── public/
│   ├── index.html
│   └── assets/
│       ├── logo-oeste-circulo.png
│       └── (demais imagens)
├── functions/
│   └── api/
│       └── files.js
├── .gitignore
└── README.md
```

**IMPORTANTE:** no GitHub, coloque o conteúdo de `oeste-portal` na RAIZ do repositório; não envie apenas o ZIP, nem deixe tudo em uma pasta `oeste-portal` dentro do repositório sem configurar Root directory.

## Publicar em Cloudflare Pages (GitHub, recomendado)
1. Descompacte o ZIP. Crie um repositório **privado** no https://github.com/new (um repositório privado evita expor o código fonte casualmente, mas não torna o site privado).
2. Faça upload dos itens **`public/`, `functions/`, `.gitignore` e `README.md`** na raiz do repositório e confirme no botão de commit. No GitHub, pastas com subpastas devem ser enviadas preservando a estrutura.
3. Acesse https://dash.cloudflare.com/ > **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**. Escolha o repositório.
4. Configure:
   - **Framework preset:** `None` / nenhum.
   - **Build command:** `exit 0` (sem etapa real de build).
   - **Build output directory:** `public`.
   - **Root directory (advanced):** deixe sem preencher se `public/` e `functions/` estiverem na raiz do repositório.
   - **Production branch:** `main`.
5. Clique **Save and Deploy**. Ao finalizar, abra o endereço `https://SEU-PROJETO.pages.dev` fornecido pelo Cloudflare.
6. Inicialmente, os botões abrem as pastas conhecidas como contingência. Para consultar todos os arquivos em tempo real, configure a Google Drive API (próxima seção).

> Não use o recurso de **arrastar e soltar ZIP no painel do Pages** se quiser a API funcionando: o Direct Upload no painel não oferece suporte a Pages Functions. Use GitHub ou Wrangler.

## Google Drive API para listagem ao vivo
1. Abra https://console.cloud.google.com/ e selecione/crie um projeto.
2. Ative a **Google Drive API**.
3. Em **APIs e serviços > Credenciais**, crie uma chave de API e restrinja seu uso à **Google Drive API**. Como a chave é usada no servidor Cloudflare, não use restrição de referenciador HTTP; valide uma política de restrição compatível com execução no servidor. Habilite cotas/alertas.
4. No Cloudflare, abra o projeto Pages > **Settings > Variables and Secrets > Add**.
5. Nome: `GOOGLE_DRIVE_API_KEY`. Valor: a chave. Ative **Encrypt** (Secret). Salve e faça um **novo deploy**.
6. Teste primeiro `https://SEU-PROJETO.pages.dev/api/files` (pasta raiz) e depois `https://SEU-PROJETO.pages.dev/api/files?folder=1W_w2ykVlXpjZgsGk11ol_uw44_gHnr0Y` (Ofertas). Se funcionar, a resposta terá uma lista `files`. A interface inclui automaticamente o parâmetro `path` ao navegar em subpastas.

Se a resposta exibir `googleStatus: 403` ou erro de referenciador/IP, confira a **restrição de aplicativo** da chave de API no Google Cloud. A chamada ao Google é feita pelo servidor do Cloudflare, não pelo navegador do visitante. Para este exemplo, uma chave sem restrição de aplicativo, restrita **somente à Google Drive API**, guardada como Secret e com cotas/alertas é uma opção de teste; nunca coloque a chave no HTML ou GitHub. A proteção de arquivos privados exige OAuth. Se a resposta disser que o Drive exige `resourceKey`, use uma integração que suporte as chaves de recurso.

**Correção 6.0:** antes, a API usava `files.get` para verificar subpastas compartilhadas por link; isto podia retornar 403/404 mesmo quando a listagem pública era permitida. Agora a validação percorre as pastas a partir da raiz usando `files.list`, verificando a presença de cada pasta entre os filhos da anterior. A função **não permite** consultar IDs arbitrários fora dessa árvore. Subpastas precisam do parâmetro `path=ID_PASTA_PAI,ID_SUBPASTA`; a interface monta isso automaticamente.

## Segurança (leitura importante)
- A pasta OESTE MARKETING estava acessível para `anyone with link` como leitora em 30/10/2026. O site **não bloqueia nem protege** automaticamente os links diretos desses arquivos.
- A integração deste projeto usa **chave de API**, adequada somente para acessar arquivos compartilhados publicamente. Ela **não implementa login OAuth**, nem concede acesso a arquivos privados do Drive.
- Para arquivos confidenciais, **restrinja o Drive**, configure login por colaborador e controle de acesso (Google OAuth com checagem de permissão). Opcionalmente aplique Cloudflare Access ao site e à API, sem confundi-lo com as permissões do Drive.
- Não publique chaves de API no repositório, HTML ou assets. Use Secrets no Cloudflare e MFA nas contas.
- A proteção de prévias do Pages não protege automaticamente o domínio principal `pages.dev`; revise separadamente o acesso ao endereço de produção.
- O portal é somente leitura: não permite criar, editar ou apagar arquivos do Drive.

### Como testar no computador
Abra `public/index.html` em um navegador. Para a listagem automática, é preciso publicar com a Pages Function e configurar a API. Sem ela, o modo de contingência disponibiliza pastas verificadas e o botão `Abrir pasta no Drive`.

Documentação: https://developers.cloudflare.com/pages/get-started/git-integration/ e https://developers.cloudflare.com/pages/functions/get-started/

## Atualização 9.0 — Seletor de visualização
O check agora é mostrado exclusivamente na metade selecionada do seletor (lista ou grade), acompanhando a alteração de modo em todas as pastas e na tela inicial. Os demais recursos foram preservados.
