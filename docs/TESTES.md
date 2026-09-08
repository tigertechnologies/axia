# AXIA — Testes de regressão

## Como rodar
Sem adicionar dependências ao projeto (usa o runner nativo do Node via tsx sob demanda):

```bash
npx tsx --test tests/classify.test.ts
```

Saída esperada: `# pass 7  # fail 0`.

## O que cobrem (Etapa 12 do plano)
- **A03** — vencimento explícito é preservado; "dias úteis" não vira data.
- **A03b/A03c** — "N dias (úteis)" sem termo inicial NÃO gera data (fica pendente).
- **A04** — data impossível (31/02) é rejeitada.
- **A05** — nomeação com prazo é classificada como *nomeação* e não inventa data final.
- **A06** — motor de regras sempre marca `needs_review`.
- **T11** — parser monetário robusto em vários formatos.

## CI (recomendado)
Adicionar ao pipeline (GitHub Actions) um passo:
```yaml
- run: npx tsx --test tests/*.test.ts
```
Bloquear merge se algum teste falhar. Estes testes são determinísticos (não dependem de rede/IA).

> Nota: `tests/` está excluído do build do Next (tsconfig `exclude`), então não afeta o deploy na Vercel.
