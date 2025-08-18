---
allowed-tools: Bash(node:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git status:*), Read, Write
argument-hint: [last-complete-date]
description: Update LuckySea dashboard with latest blockchain data via Blockscout API
model: claude-sonnet-4-20250514
---

# 🚀 LuckySea Dashboard Update

## Current Status
- **Current cache**: !`tail -5 src/data/contract-cache-v2.json | grep -E '"2025-|totalTransactions'`
- **Git status**: !`git status --porcelain`
- **Current date UTC**: !`date -u +"%Y-%m-%d %H:%M UTC"`

## Your Task

**📅 Pergunta inicial**: Qual foi o último dia completo finalizado da LuckySea? 
- Use formato: YYYY-MM-DD (ex: 2025-08-17)
- Este será o ponto de partida para calcular quais dias precisam ser sincronizados

**🎯 Processo automático**:
1. **Calcular gap**: Entre a data informada e ontem (UTC)
2. **Mostrar plano**: Quais dias serão sincronizados via Blockscout API  
3. **Confirmar**: Pedir confirmação antes de executar
4. **Sync sequencial**: Rodar `quick-sync-day.js` para cada dia faltante
5. **Validar dados**: Verificar cobertura de 24h para cada dia
6. **Atualizar cache**: Adicionar novos dados ao `contract-cache-v2.json`
7. **Commit + Push**: Triggerar deploy automático no Vercel

**📊 Resultado final**:
- ✅ Dashboard principal atualizado (hourly activity, totals)
- ✅ Advanced analytics atualizado (timeline, peak hours, status)
- ✅ Deploy automático no Vercel iniciado
- ✅ Dados 100% sincronizados com blockchain via API

**🔧 Comandos disponíveis**:
- `node quick-sync-day.js YYYY-MM-DD` - Sync um dia específico
- `git add src/data/contract-cache-v2.json` - Stage cache changes
- `git commit -m "mensagem"` - Commit com mensagem descritiva
- `git push origin main` - Trigger deploy automático

**💡 Exemplo de execução**:
```
User informa: 2025-08-17
Sistema calcula: gap até 2025-08-19 (2 dias faltando)
Mostra: "Vou sincronizar: 2025-08-18, 2025-08-19"
User confirma: y
Executa: sync de cada dia + commit + push
Resultado: Dashboard + analytics atualizados automaticamente
```

**⚠️ Importante**:
- Sempre validar formato de data do usuário
- Verificar se cada sync coletou dados de 24h completas
- Fazer um commit único com todos os dias sincronizados
- Confirmar que o push triggera o deploy no Vercel