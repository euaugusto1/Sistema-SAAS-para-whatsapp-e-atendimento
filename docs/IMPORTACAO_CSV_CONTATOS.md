# 📥 Guia de Importação de Contatos via CSV

## Formato do Arquivo CSV

O arquivo CSV deve seguir este formato:

### Colunas Obrigatórias:
- **name**: Nome do contato (obrigatório)
- **phone**: Telefone no formato internacional sem espaços (obrigatório)

### Colunas Opcionais:
- **email**: Email do contato
- **company**: Empresa do contato
- Qualquer outra coluna será salva como "customFields"

## Exemplo de Arquivo CSV

```csv
name,phone,email,company
João Silva,5511999999999,joao@email.com,Empresa ABC
Maria Santos,5511988888888,maria@email.com,Tech Solutions
Pedro Oliveira,5511977777777,pedro@email.com,
Ana Costa,5511966666666,,Marketing Pro
Carlos Souza,5511955555555,carlos@email.com,Vendas Plus
```

## Formato do Telefone

O telefone deve estar no formato internacional:
- **Sem espaços, traços ou parênteses**
- **Exemplo**: `5511999999999`
- **Estrutura**: `[código país][código área][número]`
  - Brasil (55) + São Paulo (11) + Número (999999999)

## Regras de Importação

1. **Duplicados**: Contatos com o mesmo telefone serão ignorados
2. **Validação**: Nome e telefone são obrigatórios
3. **Email**: Será convertido para minúsculas automaticamente
4. **Campos Customizados**: Colunas extras serão salvas como campos personalizados

## Como Importar

1. Acesse a aba **Contatos** no Dashboard
2. Clique no botão **📥 Importar CSV**
3. Selecione seu arquivo .csv
4. Aguarde o processamento
5. Veja o resultado com estatísticas:
   - ✅ Contatos importados com sucesso
   - ⚠️ Duplicados ignorados
   - ❌ Falhas (com descrição do erro)

## Exemplo de Resultado

```
✅ Importação concluída!

✓ 45 contatos importados
⚠️ 3 duplicados ignorados
✗ 2 falharam

⚠️ Primeiros erros:
Linha 12: Nome e telefone são obrigatórios
Linha 25: Outro contato com este telefone já existe
```

## Dicas

- ✅ Use vírgula (,) como separador
- ✅ Primeira linha deve conter os nomes das colunas
- ✅ Remova caracteres especiais dos telefones
- ✅ Teste com poucos contatos primeiro
- ✅ Mantenha backup do arquivo original

## Exportação no Excel/Google Sheets

### Excel:
1. Organize os dados nas colunas corretas
2. **Arquivo** → **Salvar Como**
3. Escolha **CSV (Separado por vírgulas) (*.csv)**
4. Salve o arquivo

### Google Sheets:
1. Organize os dados nas colunas corretas
2. **Arquivo** → **Fazer download**
3. Escolha **Valores separados por vírgula (.csv)**
4. Faça o download

## Arquivo de Exemplo

Um arquivo de exemplo está disponível em: `exemplo-importacao-contatos.csv`

## Limitações

- Tamanho máximo recomendado: **10.000 contatos por importação**
- Formato de arquivo: **Apenas .csv**
- Encoding: **UTF-8** (para caracteres especiais)

## Solução de Problemas

### "CSV vazio ou inválido"
- Verifique se o arquivo tem pelo menos 2 linhas (cabeçalho + dados)
- Confirme que está usando vírgula como separador

### "Nome e telefone são obrigatórios"
- Certifique-se que todos os registros têm name e phone preenchidos
- Verifique se não há linhas vazias no meio do arquivo

### "Outro contato com este telefone já existe"
- Este telefone já está cadastrado no sistema
- Remova a linha ou altere o telefone

## Suporte

Em caso de dúvidas ou problemas, entre em contato com o suporte técnico.
