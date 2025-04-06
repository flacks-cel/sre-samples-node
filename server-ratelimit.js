const express = require('express');
const rateLimit = require('express-rate-limit');
const app = express();
const port = 8080;

// Middleware de rate limiting (Limite de 100 requisições por minuto)
const limiter = rateLimit({
    windowMs: 60 * 1000,  // 1 minuto
    max: 100,  // Alterado para 100 requisições
    message: 'Você excedeu o limite de requisições, tente novamente mais tarde.',
});

// Aplica o rate limiter para todas as rotas
app.use(limiter);

// Função simulando chamada externa
async function externalService() {
    return 'Resposta da chamada externa';
}

// Função para simular erro de Rate Limit
function simulateRateLimitError(req, res, next) {
    // Simulando uma condição onde forçamos o erro de Rate Limit
    if (req.query.forceLimit === 'true') {
        return res.status(429).json({
            error: true,
            message: 'Simulação: Você excedeu o limite de requisições, tente novamente mais tarde.'
        });
    }
    next();
}

// Rota que simula o erro de Rate Limit quando solicitado
app.get('/api/simulate-limit', simulateRateLimitError, (req, res) => {
    res.send('Esta rota simula o erro de Rate Limit com o parâmetro ?forceLimit=true');
});

// Rota que faz a chamada simulada
app.get('/api/ratelimit', async (req, res) => {
    try {
        const result = await externalService();
        res.send(result);
    } catch (error) {
        res.status(500).send(`Erro: ${error.message}`);
    }
});

// Iniciando o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});