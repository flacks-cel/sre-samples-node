# SRE Samples Node

Este repositório contém exemplos de implementações SRE (Site Reliability Engineering) em Node.js, demonstrando padrões comuns de resiliência em aplicações:

## Padrões Implementados

### Timeout

**Problema:** Lançando um erro de timeout após 3 segundos, enquanto o serviço simulado (`externalService()`) demora **5 segundos** para responder.

**Solução:**
Aumentei o timeout de:
```javascript
const result = await timeoutPromise(3000, externalService());
```

Para:
```javascript
const result = await timeoutPromise(6000, externalService());
```

### Rate Limit

**Modificações implementadas:**
- A primeira modificação aumentei o limite para 100 requisições por minuto.
- A segunda adicionei uma rota específica que permite simular o erro de Rate Limit quando o parâmetro `forceLimit=true` é enviado na URL.

### Bulkhead

**Problema resolvido:** Aumentando a quantidade de chamadas simultâneas no bulkhead e implementando o método com threads para realizar as chamadas.

**Implementações:**
- Aumentei o limite do bulkhead de 2 para 5 requisições simultâneas.
- Implementei o uso de `worker_threads` do Node.js para criar threads paralelas.
- Adicionei uma nova rota `/api/threads` que aceita um parâmetro `?threads=N` para especificar quantas threads devem ser executadas.
- Cada thread executa um trabalho que leva 2 segundos (simulando a chamada externa) e retorna um resultado.
- O servidor loga no console todas as operações das threads, permitindo visualizar o comportamento paralelo.

**Teste do bulkhead:**
```
curl localhost:8080/api/bulkhead
```

**Teste do processamento paralelo com 5 threads:**
```
curl localhost:8080/api/threads?threads=5
```

### Circuit Breaker

**Objetivo:** Reduzir o percentual de falhas na função `externalService()` para que, quando o circuito estiver no estado "half-open" (meio aberto), as novas tentativas tenham mais chance de sucesso.

**Ajustes:**
- 80% de falhas no estado normal e quando aberto
- 20% de falhas quando o circuito está meio-aberto (testando)
- 50% de falhas quando o circuito volta ao estado fechado

**Teste:**
Execute várias vezes para ver o comportamento do circuit breaker:
```
curl localhost:8080/api/circuitbreaker
```

## Como executar os exemplos

```bash
npm install
node server-timeout.js    # Para testar o timeout
node server-ratelimit.js  # Para testar o rate limit
node server-bulkhead.js   # Para testar o bulkhead
node server-circuit-breaker.js # Para testar o circuit breaker
```
