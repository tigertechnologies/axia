// Testes de regressão determinísticos — Etapa 12 (A03, A04, A05) + T11.
// Rodar: npx tsx --test tests/classify.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyByRules } from "../src/lib/classify.ts";
import { parseBRLToCents } from "../src/lib/money.ts";

// ── A03: vencimento explícito é preservado (não vira data calculada) ─────────
test("A03 — preserva vencimento explícito e ignora 'dias úteis'", () => {
  const c = classifyByRules("Intimação: prazo de 15 dias úteis. Vencimento expresso: 30/09/2026.");
  assert.equal(c.due_date, "2026-09-30");
});

// ── A03b: 'N dias úteis' SEM data explícita não vira data (fica pendente) ────
test("A03b — 'dias úteis' sem vencimento explícito não gera data", () => {
  const c = classifyByRules("Fica intimado a se manifestar no prazo de 15 dias úteis.");
  assert.equal(c.due_date, null);
  assert.ok(c.due_note && /úteis/i.test(c.due_note));
});

// ── A03c: 'N dias' comuns não usam a data de hoje como termo inicial ─────────
test("A03c — 'N dias' sem termo inicial não gera data", () => {
  const c = classifyByRules("Prazo de 15 dias para entrega do laudo.");
  assert.equal(c.due_date, null);
});

// ── A04: data impossível é rejeitada ────────────────────────────────────────
test("A04 — rejeita data impossível 31/02/2026", () => {
  const c = classifyByRules("Intimação para entrega de laudo até 31/02/2026.");
  assert.equal(c.due_date, null);
  assert.ok(c.due_note && /inválida/i.test(c.due_note));
});

// ── A05: nomeação + prazo na mesma mensagem — identifica nomeação e não ──────
//         inventa data final (sem base explícita) ───────────────────────────
test("A05 — nomeação com prazo: categoria nomeacao, sem data inventada", () => {
  const c = classifyByRules("Fica V.Sa. nomeado perito no processo 1002345-67.2025.8.26.0001. Prazo de 15 dias para entrega do laudo.");
  assert.equal(c.category, "nomeacao");
  assert.equal(c.due_date, null);                     // não inventa data
  assert.equal(c.process_ref, "1002345-67.2025.8.26.0001");
});

// ── A06: classificador por regras sempre exige revisão ──────────────────────
test("A06 — needs_review sempre verdadeiro no motor de regras", () => {
  const c = classifyByRules("Qualquer texto.");
  assert.equal(c.needs_review, true);
});

// ── T11: parser monetário robusto ───────────────────────────────────────────
test("T11 — parseBRLToCents em vários formatos", () => {
  assert.equal(parseBRLToCents("2.400,00"), 240000);
  assert.equal(parseBRLToCents("1.500"), 150000);
  assert.equal(parseBRLToCents("1500.50"), 150050);   // não vira 150050 errado
  assert.equal(parseBRLToCents("1500,5"), 150050);
  assert.equal(parseBRLToCents("1880"), 188000);
  assert.equal(parseBRLToCents("R$ 1.234,56"), 123456);
  assert.equal(parseBRLToCents(""), null);
  assert.equal(parseBRLToCents("abc"), null);
});
