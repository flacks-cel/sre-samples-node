const express = require('express');
const { bulkhead } = require('cockatiel');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const app = express();
const port = 8080;

// Aumentando para 5 requisições simultâneas
const bulkheadPolicy = bulkhead(5);

// Função simulando chamada externa
async function externalService() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve('Resposta da chamada externa');
        }, 2000);  // Simula uma chamada que demora 2 segundos
    });
}

// Função para executar chamadas usando worker threads
function runServiceWithThreads(numThreads) {
    return new Promise((resolve) => {
        const results = [];
        let completedThreads = 0;
        
        console.log(`Iniciando ${numThreads} threads para chamadas paralelas...`);
        
        for (let i = 0; i < numThreads; i++) {
            const worker = new Worker(__filename, {
                workerData: { threadId: i }
            });
            
            worker.on('message', (message) => {
                console.log(`Thread ${i} completou: ${message}`);
                results.push(message);
                completedThreads++;
                
                if (completedThreads === numThreads) {
                    resolve(results);
                }
            });
            
            worker.on('error', (err) => {
                console.error(`Erro na thread ${i}:`, err);
                completedThreads++;
                
                if (completedThreads === numThreads) {
                    resolve(results);
                }
            });
        }
    });
}

// Lógica para worker threads
if (!isMainThread) {
    // Código executado dentro da thread worker
    const { threadId } = workerData;
    
    // Simula o processamento que leva 2 segundos
    setTimeout(() => {
        parentPort.postMessage(`Resposta da thread ${threadId}`);
    }, 2000);
} else {
    // Código executado na thread principal (só executa quando o arquivo é executado diretamente)
    
    // Rota que faz a chamada simulada com bulkhead
    app.get('/api/bulkhead', async (req, res) => {
        try {
            const result = await bulkheadPolicy.execute(() => externalService());
            res.send(result);
        } catch (error) {
            res.status(500).send(`Erro: ${error.message}`);
        }
    });
    
    // Nova rota que utiliza threads para realizar chamadas paralelas
    app.get('/api/threads', async (req, res) => {
        try {
            // Pega o número de threads do query parameter ou usa 3 como padrão
            const numThreads = parseInt(req.query.threads) || 3;
            
            console.log(`Recebida requisição para executar ${numThreads} threads`);
            const results = await runServiceWithThreads(numThreads);
            
            res.json({
                message: 'Chamadas com threads concluídas',
                threads: numThreads,
                results: results
            });
        } catch (error) {
            res.status(500).send(`Erro: ${error.message}`);
        }
    });
    
    // Iniciando o servidor
    app.listen(port, () => {
        console.log(`Servidor rodando em http://localhost:${port}`);
        console.log(`- Teste bulkhead: curl localhost:${port}/api/bulkhead`);
        console.log(`- Teste com threads: curl localhost:${port}/api/threads?threads=5`);
    });
}