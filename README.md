# BioConserva — Gestão de Biodiversidade e Espécies Ameaçadas

Aplicação web acadêmica para explorar espécies, níveis de risco, ameaças documentadas, ocorrências geográficas, estatísticas populacionais e referências científicas.

## Funcionalidades

- Filtragem de espécies por bioma, animal e classificação de risco.
- Ordenação por taxa de declínio populacional.
- Página individual de cada espécie com dados relacionados do banco.
- Consulta de ameaças, ocorrências, estatísticas e referências científicas.
- Interface com identidade visual inspirada na natureza e adaptação a telas menores.

## Tecnologias

- Node.js
- Express
- EJS
- MySQL
- `mysql2` para acesso ao banco de dados
- `config.js` para carregar variáveis locais sem expor credenciais no código
- HTML, CSS e JavaScript

## Requisitos

Instale uma versão LTS recente do Node.js e o MySQL Server. Você também pode usar o MySQL Workbench para importar o script.

## Como executar localmente

1. Clone ou baixe este repositório.
2. Abra a pasta do projeto no VS Code.
3. Instale as dependências:

   ```bash
   npm install
   ```

4. Crie o banco e os dados iniciais. No MySQL Workbench, abra e execute `database/bio_conservacao.sql`. O script cria o banco `bio_conservacao`, as seis tabelas e os dados de exemplo. Execute-o em uma instalação local de desenvolvimento; ele contém `CREATE DATABASE` e `INSERT`.
5. Crie o arquivo `.env` copiando `.env.example` e informe as credenciais do seu próprio MySQL. O arquivo `config.js` carrega esse arquivo local, e o `.gitignore` impede que o `.env` seja publicado.

   Exemplo de `.env`:

   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=sua_senha_local
   DB_NAME=bio_conservacao
   PORT=3000
   ```

6. Inicie a aplicação:

   ```bash
   npm start
   ```

7. Abra `http://localhost:3000` no navegador.

## Estrutura principal

```text
biodiversidade-app/
├── database/
│   └── bio_conservacao.sql
├── public/
│   ├── css/
│   │   └── style.css
│   └── images/
├── views/
│   ├── index.ejs
│   ├── resultados.ejs
│   └── animal.ejs
├── .env.example
├── .gitignore
├── db.js
├── package.json
├── package-lock.json
└── server.js
```

## Modelo de dados

O script SQL cria as tabelas:

- `especie`
- `classificacao_risco`
- `ameaca_principal`
- `ocorrencia`
- `estatistica_populacional`
- `pesquisador_referencia`

As chaves estrangeiras relacionam espécies, categorias de risco, ameaças, ocorrências, estatísticas e referências científicas. A página da espécie apresenta valores ausentes como informação não cadastrada, quando aplicável.

## Segurança

- O arquivo `.env` contém configurações locais e deve permanecer fora do Git.
- O `.gitignore` bloqueia `.env` e `node_modules/`.
- Configure credenciais próprias no seu ambiente e não compartilhe senhas em repositórios públicos.

## Observação acadêmica

O conjunto inicial de dados e as referências devem ser conferidos com as publicações originais e bases oficiais antes de serem utilizados como dados científicos definitivos. Este repositório é voltado à demonstração acadêmica e de portfólio.
