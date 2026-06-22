"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const spintax_1 = require("./spintax");
function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`Assertion failed: Expected "${expected}", but got "${actual}". Details: ${message}`);
    }
}
function testSpintaxBasic() {
    const result = (0, spintax_1.parseSpintax)('Olá');
    assertEqual(result, 'Olá', 'Texto sem spintax deve permanecer inalterado');
}
function testSpintaxSingleChoice() {
    const input = '{Olá|Oi}';
    const runs = new Set();
    for (let i = 0; i < 50; i++) {
        runs.add((0, spintax_1.parseSpintax)(input));
    }
    if (!runs.has('Olá') || !runs.has('Oi')) {
        throw new Error(`Spintax single choice should resolve to either "Olá" or "Oi". Resolved values: ${Array.from(runs).join(', ')}`);
    }
    if (runs.size !== 2) {
        throw new Error(`Spintax single choice resolved to invalid choices. Resolved values: ${Array.from(runs).join(', ')}`);
    }
    console.log('✅ testSpintaxSingleChoice passed');
}
function testSpintaxMultipleChoices() {
    const input = '{Bom dia|Boa tarde|Boa noite} {amigo|cliente}';
    const runs = new Set();
    for (let i = 0; i < 200; i++) {
        runs.add((0, spintax_1.parseSpintax)(input));
    }
    // Total of 3 * 2 = 6 possibilities
    console.log(`Resolved options count: ${runs.size} of 6`);
    if (runs.size < 4) {
        throw new Error(`Not enough combinations generated. Got ${runs.size}.`);
    }
    for (const choice of runs) {
        const parts = choice.split(' ');
        const greeting = parts[0] + (parts[1] === 'dia' || parts[1] === 'tarde' || parts[1] === 'noite' ? ' ' + parts[1] : '');
        const target = parts[parts.length - 1];
        if (!['Bom dia', 'Boa tarde', 'Boa noite'].includes(greeting)) {
            throw new Error(`Invalid greeting resolved: "${greeting}"`);
        }
        if (!['amigo', 'cliente'].includes(target)) {
            throw new Error(`Invalid target resolved: "${target}"`);
        }
    }
    console.log('✅ testSpintaxMultipleChoices passed');
}
function testSpintaxNested() {
    // Test nested braces: {A|{B|C}}
    const input = '{Oi|{Olá|Tudo bem}}';
    const runs = new Set();
    for (let i = 0; i < 100; i++) {
        runs.add((0, spintax_1.parseSpintax)(input));
    }
    if (!runs.has('Oi') || !runs.has('Olá') || !runs.has('Tudo bem')) {
        throw new Error(`Nested spintax should resolve to Oi, Olá, or Tudo bem. Got: ${Array.from(runs).join(', ')}`);
    }
    console.log('✅ testSpintaxNested passed');
}
function runAllTests() {
    console.log('🧪 Iniciando testes de Spintax...');
    try {
        testSpintaxBasic();
        testSpintaxSingleChoice();
        testSpintaxMultipleChoices();
        testSpintaxNested();
        console.log('🎉 Todos os testes de Spintax passaram com sucesso!');
    }
    catch (error) {
        console.error('❌ Falha nos testes de Spintax:', error.message);
        process.exit(1);
    }
}
runAllTests();
//# sourceMappingURL=spintax.test.js.map