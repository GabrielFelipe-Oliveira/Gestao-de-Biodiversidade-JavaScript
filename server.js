require('./config');

const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Função auxiliar para carregar os botões de filtro do banco de dados
async function carregarFiltros() {
    const [biomas] = await db.query('SELECT DISTINCT bioma FROM ocorrencia WHERE bioma IS NOT NULL');
    const [animais] = await db.query('SELECT id_especie, nome_popular FROM especie ORDER BY nome_popular');
    const [riscos] = await db.query('SELECT DISTINCT sigla FROM classificacao_risco');
    return { biomas, animais, riscos };
}

// Rota Principal (Home)
app.get('/', async (req, res) => {
    try {
        const filtros = await carregarFiltros();
        res.render('index', { filtros });
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao carregar a página inicial.');
    }
});

// Rota de Resultados (Recebe os filtros e faz a busca dinâmica)
app.get('/resultados', async (req, res) => {
    try {
        const filtros = await carregarFiltros();
        
        // Base da query
        let query = `
            SELECT DISTINCT
                e.id_especie, e.nome_cientifico, e.nome_popular, e.familia,
                cr.sigla AS risco, cr.descricao AS risco_desc,
                ap.descricao_ameaca,
                pr.autores, pr.titulo_artigo, pr.ano_publicacao, pr.instituicao_vinculada,
                ep.taxa_declinio_percentual
            FROM especie e
            LEFT JOIN classificacao_risco cr ON e.id_risco = cr.id_risco
            LEFT JOIN ameaca_principal ap ON e.id_especie = ap.id_especie
            LEFT JOIN estatistica_populacional ep ON e.id_especie = ep.id_especie
            LEFT JOIN pesquisador_referencia pr ON ep.id_referencia = pr.id_referencia
            LEFT JOIN ocorrencia o ON e.id_especie = o.id_especie
            WHERE 1=1
        `;
        const params = [];

        // Adiciona os filtros na query SQL (se o usuário tiver clicado em algum)
        if (req.query.bioma) {
            query += ` AND o.bioma = ?`;
            params.push(req.query.bioma);
        }
        if (req.query.animal) {
            query += ` AND e.id_especie = ?`;
            params.push(req.query.animal);
        }
        if (req.query.risco) {
            query += ` AND cr.sigla = ?`;
            params.push(req.query.risco);
        }

        // Filtros de Ordenação de Declínio
        if (req.query.declinio === 'maior') {
            query += ` ORDER BY ep.taxa_declinio_percentual DESC`;
        } else if (req.query.declinio === 'menor') {
            query += ` ORDER BY ep.taxa_declinio_percentual ASC`;
        }

        const [animaisResult] = await db.query(query, params);

        res.render('resultados', { 
            filtros, 
            animais: animaisResult, 
            queryAtual: req.query // Passamos a query atual para marcar o botão como ativo na tela
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao buscar dados no banco.');
    }
});


// Página de detalhes de uma espécie: reúne as seis tabelas relacionadas ao animal.
app.get('/animal/:id', async (req, res) => {
    const idEspecie = Number(req.params.id);

    if (!Number.isSafeInteger(idEspecie) || idEspecie <= 0) {
        return res.status(404).send('Espécie não encontrada. <a href="/">Voltar para a página inicial</a>.');
    }

    try {
        // Tabela especie + classificação_risco (LEFT JOIN mantém a espécie mesmo sem classificação).
        const especieQuery = `
            SELECT
                e.id_especie,
                e.nome_cientifico,
                e.nome_popular,
                e.familia,
                e.autor_descobrimento,
                e.id_risco,
                cr.sigla AS risco_sigla,
                cr.descricao AS risco_descricao
            FROM especie e
            LEFT JOIN classificacao_risco cr ON e.id_risco = cr.id_risco
            WHERE e.id_especie = ?
            LIMIT 1
        `;

        // Ameaças associadas diretamente à espécie.
        const ameacasQuery = `
            SELECT id_ameaca, id_especie, descricao_ameaca
            FROM ameaca_principal
            WHERE id_especie = ?
            ORDER BY id_ameaca
        `;

        // Ocorrências + todos os campos da referência associada, quando houver.
        const ocorrenciasQuery = `
            SELECT
                o.id_ocorrencia,
                o.id_especie,
                o.id_referencia,
                o.bioma,
                o.latitude,
                o.longitude,
                o.data_registro,
                pr.autores AS ref_autores,
                pr.titulo_artigo AS ref_titulo_artigo,
                pr.ano_publicacao AS ref_ano_publicacao,
                pr.instituicao_vinculada AS ref_instituicao_vinculada,
                pr.doi_ou_link AS ref_doi_ou_link
            FROM ocorrencia o
            LEFT JOIN pesquisador_referencia pr ON o.id_referencia = pr.id_referencia
            WHERE o.id_especie = ?
            ORDER BY o.data_registro DESC, o.id_ocorrencia
        `;

        // Métricas populacionais + todos os campos da referência associada, quando houver.
        const estatisticasQuery = `
            SELECT
                ep.id_estatistica,
                ep.id_especie,
                ep.id_referencia,
                ep.populacao_estimada,
                ep.taxa_declinio_percentual,
                ep.perda_habitat_percentual,
                ep.periodo_analise,
                pr.autores AS ref_autores,
                pr.titulo_artigo AS ref_titulo_artigo,
                pr.ano_publicacao AS ref_ano_publicacao,
                pr.instituicao_vinculada AS ref_instituicao_vinculada,
                pr.doi_ou_link AS ref_doi_ou_link
            FROM estatistica_populacional ep
            LEFT JOIN pesquisador_referencia pr ON ep.id_referencia = pr.id_referencia
            WHERE ep.id_especie = ?
            ORDER BY ep.id_estatistica
        `;

        // Referências únicas que se relacionam à espécie por ocorrência e/ou estatística.
        const referenciasQuery = `
            SELECT DISTINCT
                pr.id_referencia,
                pr.autores,
                pr.titulo_artigo,
                pr.ano_publicacao,
                pr.instituicao_vinculada,
                pr.doi_ou_link
            FROM pesquisador_referencia pr
            INNER JOIN (
                SELECT id_referencia
                FROM ocorrencia
                WHERE id_especie = ? AND id_referencia IS NOT NULL
                UNION
                SELECT id_referencia
                FROM estatistica_populacional
                WHERE id_especie = ? AND id_referencia IS NOT NULL
            ) relacionadas ON relacionadas.id_referencia = pr.id_referencia
            ORDER BY pr.ano_publicacao DESC, pr.id_referencia
        `;

        const [especieResult, ameacasResult, ocorrenciasResult, estatisticasResult, referenciasResult] = await Promise.all([
            db.query(especieQuery, [idEspecie]),
            db.query(ameacasQuery, [idEspecie]),
            db.query(ocorrenciasQuery, [idEspecie]),
            db.query(estatisticasQuery, [idEspecie]),
            db.query(referenciasQuery, [idEspecie, idEspecie])
        ]);

        const especie = especieResult[0][0];
        if (!especie) {
            return res.status(404).send('Espécie não encontrada. <a href="/">Voltar para a página inicial</a>.');
        }

        res.render('animal', {
            especie,
            ameacas: ameacasResult[0],
            ocorrencias: ocorrenciasResult[0],
            estatisticas: estatisticasResult[0],
            referencias: referenciasResult[0]
        });
    } catch (error) {
        console.error('Erro ao carregar detalhes da espécie:', error);
        res.status(500).send('Não foi possível carregar os detalhes desta espécie. Verifique a conexão com o banco de dados.');
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});