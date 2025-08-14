# Daily Cache Update Workflow

## COPIE ESTE CÓDIGO EXATO NO GITHUB ACTIONS:

```yaml
name: Daily Cache Update

on:
  schedule:
    - cron: "5 0 * * *"
  workflow_dispatch:

jobs:
  update-cache:
    runs-on: ubuntu-latest
    
    steps:
      - name: Update Cache
        run: |
          echo "Starting daily cache update..."
          response=$(curl -s -w "%{http_code}" \
            -X GET \
            https://luckysea-lisk-analytics-acx5ixwec-rodcoppis-projects.vercel.app/api/force-update)
          http_code="${response: -3}"
          response_body="${response%???}"
          echo "HTTP Status: $http_code"
          echo "Response: $response_body"
          if [ "$http_code" = "200" ]; then
            echo "✅ Update completed successfully!"
          else
            echo "❌ Update failed"
            exit 1
          fi
```

## INSTRUÇÕES:

1. **GitHub** → **Actions** → **New workflow** → **"set up a workflow yourself"**
2. **DELETE TUDO** que vem por padrão no editor
3. **COPIE EXATAMENTE** o código YAML acima
4. **Commit** como `daily-update.yml`
5. **Teste** com "Run workflow"

## IMPORTANT NOTES:

- ✅ Token secreto: `AUTO_UPDATE_TOKEN` já configurado
- ✅ Endpoint: `https://luckysea-lisk-analytics.vercel.app/api/auto-update`
- ✅ Schedule: Todo dia às 00:05 UTC
- ✅ Manual trigger: Disponível para testes

## TROUBLESHOOTING:

Se ainda der erro YAML:
- Certifique-se que não há espaços antes de `name:`, `on:`, `jobs:`
- Use exatamente 2 espaços para indentação
- Não misture tabs e espaços

## TEST COMMANDS (local):

```bash
# Test GET (should return status info)
curl -X GET https://luckysea-lisk-analytics.vercel.app/api/auto-update

# Test POST (should trigger update)
curl -X POST \
  -H "Authorization: Bearer luck7sea2025analytics3secure8token9daily4update1" \
  -H "Content-Type: application/json" \
  https://luckysea-lisk-analytics.vercel.app/api/auto-update
```