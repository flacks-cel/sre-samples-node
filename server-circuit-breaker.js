const express = require('express');
const CircuitBreaker = require('opossum');
const app = express();
const port = 8080;

// Variável para controlar dinamicamente a taxa de falha
let failureRate = 0.8; // Começamos com 80% de falhas

// Função para manipular a taxa de falha com base no estado do circuito
function adjustFailureRate(state) {
    if (state === 'halfOpen') {
        // Quando o circuito está testando novamente, reduzimos a taxa de falha para 20%
        // para dar maior chance de sucesso
        console.log('Reduzindo taxa de falha para 20% durante o teste do circuito');
        failureRate = 0.2;
    } else if (state === 'open') {
        // Mantemos uma alta taxa de falha enquanto o circuito está aberto
        console.log('Mantendo taxa de falha em 80% com circuito aberto');
        failureRate = 0.8;
    } else if (state === 'close') {
        // Após o circuito fechar, estabelecemos uma taxa média de falha (50%)
        console.log('Ajustando taxa de falha para 50% com circuito fechado');
        failureRate = 0.5;
    }
}

// Função simulando chamada externa com taxa de falha controlada
async function externalService() {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const shouldFail = Math.random() < failureRate;  // Usa a taxa de falha dinâmica
            if (shouldFail) {
                console.log(`Chamada falhou (Probabilidade atual de falha: ${failureRate * 100}%)`);
                reject(new Error('Falha na chamada externa'));
            } else {
                console.log(`Chamada bem-sucedida (Probabilidade atual de falha: ${failureRate * 100}%)`);
                resolve('Resposta da chamada externa - Sucesso!');
            }
        }, 2000);  // Simula uma chamada que demora 2 segundos
    });
}

// Configuração do Circuit Breaker
const breaker = new CircuitBreaker(externalService, {
    timeout: 3000,  // Tempo limite de 3 segundos para a chamada
    errorThresholdPercentage: 50,  // Abre o circuito se 50% das requisições falharem
    resetTimeout: 10000,  // Tenta fechar o circuito após 10 segundos
    rollingCountTimeout: 10000,  // Janela de 10 segundos para contagem de falhas
    rollingCountBuckets: 10  // Divide a janela em 10 buckets para estatística mais granular
});

// Lidando com sucesso e falhas do Circuit Breaker
breaker.fallback(() => 'Resposta do fallback: Circuito aberto, serviço indisponível no momento');

// Eventos do Circuit Breaker com ajuste da taxa de falha
breaker.on('open', () => {
    console.log('CIRCUITO ABERTO! Muitas falhas detectadas, parando tentativas por um tempo.');
    adjustFailureRate('open');
});

breaker.on('halfOpen', () => {
    console.log('CIRCUITO MEIO ABERTO! Testando com uma requisição para ver se o serviço se recuperou.');
    adjustFailureRate('halfOpen');
});

breaker.on('close', () => {
    console.log('CIRCUITO FECHADO! O serviço está funcionando normalmente novamente.');
    adjustFailureRate('close');
});

breaker.on('reject', () => console.log('Requisição rejeitada pelo Circuit Breaker - circuito ainda aberto'));
breaker.on('failure', () => console.log('Falha registrada pelo Circuit Breaker'));
breaker.on('success', () => console.log('Sucesso registrado pelo Circuit Breaker'));

// Rota para visualizar estado atual do circuit breaker
app.get('/api/status', (req, res) => {
    res.json({
        state: breaker.status.state,
        stats: {
            successful: breaker.stats.successes,
            failed: breaker.stats.failures,
            rejected: breaker.stats.rejects,
            timeout: breaker.stats.timeouts
        },
        failureRate: `${failureRate * 100}%`
    });
});

// Rota para forçar o reset do circuit breaker
app.get('/api/reset', (req, res) => {
    breaker.close();
    res.send('Circuit breaker foi resetado para o estado fechado');
});

// Rota que faz a chamada simulada com o Circuit Breaker
app.get('/api/circuitbreaker', async (req, res) => {
    try {
        const result = await breaker.fire();
        res.send(result);
    } catch (error) {
        res.status(500).send(`Erro: ${error.message}`);
    }
});

// Iniciando o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log(`- Teste o circuit breaker: curl localhost:${port}/api/circuitbreaker`);
    console.log(`- Visualize o status: curl localhost:${port}/api/status`);
    console.log(`- Reset do circuit breaker: curl localhost:${port}/api/reset`);
});