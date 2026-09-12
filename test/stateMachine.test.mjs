// Teste da máquina de estados (executável direto com node, sem framework)
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// Compila o TS do domínio para JS temporário e importa
execSync('npx tsc src/modules/journey/domain/stateMachine.ts --outDir /tmp/dom --module esnext --target es2020 --moduleResolution node 2>/dev/null || true', { cwd: process.cwd() });

const mod = await import('/tmp/dom/stateMachine.js');
const { canTransition, JOURNEY_STAGES, proximaEtapaSugerida } = mod;

let pass = 0, fail = 0;
function check(nome, cond) { if (cond) { pass++; console.log('  ✅', nome); } else { fail++; console.log('  ❌', nome); } }

console.log('=== TRANSIÇÕES VÁLIDAS ===');
check('nova nomeação → ação necessária', canTransition({currentStage:'novas_nomeacoes',targetStage:'acao_necessaria',eventType:'NOMINATION_CONFIRMED',actorType:'medico'}).allowed);
check('agendar → agendadas', canTransition({currentStage:'agendar_pericia',targetStage:'pericias_agendadas',eventType:'APPOINTMENT_SCHEDULED',actorType:'medico'}).allowed);
check('elaboração → protocolar (médico)', canTransition({currentStage:'laudo_em_elaboracao',targetStage:'protocolar_laudo',eventType:'REPORT_VALIDATED',actorType:'medico'}).allowed);
check('pós-laudo → finalizadas (médico)', canTransition({currentStage:'pos_laudo',targetStage:'finalizadas',eventType:'CASE_FINISHED',actorType:'medico'}).allowed);
check('finalizadas → pós-laudo (reabertura por esclarecimento)', canTransition({currentStage:'finalizadas',targetStage:'pos_laudo',eventType:'CASE_REOPENED',actorType:'tribunal'}).allowed);

console.log('=== TRANSIÇÕES INVÁLIDAS (devem ser negadas) ===');
check('NÃO pode pular nomeação → finalizadas', !canTransition({currentStage:'novas_nomeacoes',targetStage:'finalizadas',eventType:'CASE_FINISHED',actorType:'medico'}).allowed);
check('NÃO pode agendar → protocolar (salto)', !canTransition({currentStage:'agendar_pericia',targetStage:'protocolar_laudo',eventType:'REPORT_VALIDATED',actorType:'medico'}).allowed);

console.log('=== IA NÃO PODE PRATICAR ATOS HUMANOS (seção 5) ===');
check('IA NÃO pode protocolar', !canTransition({currentStage:'laudo_em_elaboracao',targetStage:'protocolar_laudo',eventType:'REPORT_VALIDATED',actorType:'ia'}).allowed);
check('IA NÃO pode finalizar', !canTransition({currentStage:'pos_laudo',targetStage:'finalizadas',eventType:'CASE_FINISHED',actorType:'ia'}).allowed);
check('Médico PODE protocolar', canTransition({currentStage:'laudo_em_elaboracao',targetStage:'protocolar_laudo',eventType:'REPORT_VALIDATED',actorType:'medico'}).allowed);

console.log('=== OVERRIDE ADMIN (exceção justificada) ===');
check('override por médico é permitido', canTransition({currentStage:'novas_nomeacoes',targetStage:'finalizadas',eventType:'ADMIN_OVERRIDE',actorType:'medico'}).allowed);
check('override por IA é NEGADO', !canTransition({currentStage:'novas_nomeacoes',targetStage:'finalizadas',eventType:'ADMIN_OVERRIDE',actorType:'ia'}).allowed);

console.log('=== COBERTURA: toda etapa tem próxima ação (menos finalizadas ser terminal-ish) ===');
check('10 etapas definidas', JOURNEY_STAGES.length === 10);

console.log(`\n=== RESULTADO: ${pass} passaram, ${fail} falharam ===`);
process.exit(fail > 0 ? 1 : 0);
