const fs = require('fs');
const acorn = require('acorn');
const walk = require('acorn-walk');
const path = require('path');

/**
 * 2025 LIGHTVIEW CODEBASE METRICS ENGINE
 * Calculates:
 * - Cyclomatic Complexity (Control Flow Paths)
 * - Cognitive Complexity (2025 SonarSource Spec)
 * - Halstead Volume (Operator/Operand Density)
 * - SLOC (Source Lines of Code)
 * - Maintainability Index (MI)
 */

const TARGET_FILES = [
    '../../lightview.js',
    '../../lightview-x.js',
    '../../lightview-router.js',
    '../../node_modules/react/cjs/react.development.js',
    '../../node_modules/@grucloud/bau/bau.js',
    '../../node_modules/htmx.org/dist/htmx.js',
    '../../node_modules/juris/juris.js'
];

// --- METRIC CALCULATORS ---

const getCyclomaticComplexity = (fnNode) => {
    let complexity = 1;
    walk.recursive(fnNode.body, null, {
        IfStatement(node, state, c) { complexity++; c(node.test, state); c(node.consequent, state); if (node.alternate) c(node.alternate, state); },
        ConditionalExpression(node, state, c) { complexity++; c(node.test, state); c(node.consequent, state); c(node.alternate, state); },
        WhileStatement(node, state, c) { complexity++; c(node.test, state); c(node.body, state); },
        DoWhileStatement(node, state, c) { complexity++; c(node.test, state); c(node.body, state); },
        ForStatement(node, state, c) { complexity++; if (node.init) c(node.init, state); if (node.test) c(node.test, state); if (node.update) c(node.update, state); c(node.body, state); },
        ForInStatement(node, state, c) { complexity++; c(node.left, state); c(node.right, state); c(node.body, state); },
        ForOfStatement(node, state, c) { complexity++; c(node.left, state); c(node.right, state); c(node.body, state); },
        LogicalExpression(node, state, c) {
            if (node.operator === '&&' || node.operator === '||' || node.operator === '??') complexity++;
            c(node.left, state); c(node.right, state);
        },
        SwitchCase(node, state, c) { if (node.test) complexity++; if (node.test) c(node.test, state); node.consequent.forEach(n => c(n, state)); },
        CatchClause(node, state, c) { complexity++; if (node.param) c(node.param, state); c(node.body, state); },
        FunctionDeclaration() { }, FunctionExpression() { }, ArrowFunctionExpression() { }
    });
    return complexity;
};

const getCognitiveComplexity = (fnNode, fnName) => {
    let score = 0;
    const findRecursion = (node) => {
        let count = 0;
        walk.simple(node, {
            CallExpression(call) { if (call.callee.type === 'Identifier' && call.callee.name === fnName) count++; }
        });
        return count;
    };
    const traverse = (n, d) => {
        if (!n) return 0;
        let s = 0;
        switch (n.type) {
            case 'IfStatement':
                s += (1 + d);
                s += traverse(n.test, d);
                s += traverse(n.consequent, d + 1);
                if (n.alternate) {
                    s += 1;
                    if (n.alternate.type === 'IfStatement') s += traverseBranch(n.alternate, d);
                    else s += traverse(n.alternate, d + 1);
                }
                break;
            case 'SwitchStatement': s += (1 + d); n.cases.forEach(c => s += traverse(c, d + 1)); break;
            case 'ForStatement': case 'ForInStatement': case 'ForOfStatement': case 'WhileStatement': case 'DoWhileStatement':
                s += (1 + d); s += traverse(n.body, d + 1); break;
            case 'CatchClause': s += (1 + d); s += traverse(n.body, d + 1); break;
            case 'LogicalExpression': s += 1; break; // Naive: count each operator sequence as 1
            case 'ConditionalExpression': s += 1; s += traverse(n.consequent, d + 1); s += traverse(n.alternate, d + 1); break;
            case 'BreakStatement': case 'ContinueStatement': s += 1; break;
            case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression': break;
            default:
                for (const key in n) {
                    const c = n[key];
                    if (Array.isArray(c)) c.forEach(i => { if (i?.type) s += traverse(i, d); });
                    else if (c?.type) s += traverse(c, d);
                }
        }
        return s;
    };
    const traverseBranch = (n, d) => {
        let s = 1; s += traverse(n.test, d); s += traverse(n.consequent, d + 1);
        if (n.alternate) {
            if (n.alternate.type === 'IfStatement') s += traverseBranch(n.alternate, d);
            else { s += 1; s += traverse(n.alternate, d + 1); }
        }
        return s;
    };
    if (fnNode.body) {
        score += traverse(fnNode.body, 0);
        score += findRecursion(fnNode.body);
    }
    return score;
};

const calculateHalstead = (code) => {
    let tokens = [];
    try {
        tokens = [...acorn.tokenizer(code, { ecmaVersion: 'latest' })];
    } catch (e) {
        // Fallback or skip if tokenization fails for complex files
    }
    const operators = new Set(['(', ')', '[', ']', '{', '}', '.', ',', ';', ':', '?', '...', '=', '+=', '-=', '*=', '/=', '==', '===', '!=', '!==', '<', '>', '<=', '>=', '+', '-', '*', '/', '%', '++', '--', '&&', '||', '??', '!', 'typeof', 'let', 'const', 'var', 'if', 'else', 'for', 'while', 'return']);
    let N1 = 0, N2 = 0; const n1set = new Set(), n2set = new Set();
    tokens.forEach(t => {
        const txt = t.value !== undefined ? String(t.value) : t.type.label;
        if (operators.has(txt)) { N1++; n1set.add(txt); } else { N2++; n2set.add(txt); }
    });
    const N = N1 + N2;
    const n = n1set.size + n2set.size;
    const volume = N * Math.log2(n || 1);
    return { volume, n1: n1set.size, n2: n2set.size, N1, N2 };
};

const getSLOC = (code) => code.split('\n').filter(l => l.trim().length > 0 && !l.trim().startsWith('//')).length;

const calculateMI = (volume, cc, sloc) => {
    // Standard MI formula: 171 - 5.2 * ln(V) - 0.23 * CC - 16.2 * ln(SLOC)
    const mi = 171 - 5.2 * Math.log(volume || 1) - 0.23 * cc - 16.2 * Math.log(sloc || 1);
    return Math.max(0, Math.min(100, (mi * 100) / 171));
};

// --- ANALYSIS CORE ---

const analyzeFile = (filePath) => {
    const fullPath = path.resolve(__dirname, filePath);
    if (!fs.existsSync(fullPath)) return { error: `File not found: ${filePath}` };

    const code = fs.readFileSync(fullPath, 'utf8');
    let ast;
    try {
        ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script' });
    } catch (e) {
        try {
            ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
        } catch (e2) {
            return { error: `AST Parse Error: ${e2.message}` };
        }
    }
    const sloc = getSLOC(code);
    const fileHalstead = calculateHalstead(code);

    const fns = [];
    walk.ancestor(ast, {
        FunctionDeclaration(node) { fns.push({ node, name: node.id?.name || '<anonymous>' }); },
        FunctionExpression(node, state, anc) {
            let name = '<anonymous>';
            const p = anc[anc.length - 2];
            if (p?.type === 'VariableDeclarator' && p.id?.name) name = p.id.name;
            else if (p?.type === 'Property' && p.key?.name) name = p.key.name;
            else if (p?.type === 'AssignmentExpression' && p.left?.name) name = p.left.name;
            fns.push({ node, name });
        },
        ArrowFunctionExpression(node, state, anc) {
            let name = '<anonymous>';
            const p = anc[anc.length - 2];
            if (p?.type === 'VariableDeclarator' && p.id?.name) name = p.id.name;
            fns.push({ node, name });
        }
    });

    const results = fns.map(f => {
        const cc = getCyclomaticComplexity(f.node);
        const cog = getCognitiveComplexity(f.node, f.name);
        const fCode = code.slice(f.node.start, f.node.end);
        const h = calculateHalstead(fCode);
        const fSloc = getSLOC(fCode);
        const mi = calculateMI(h.volume, cc, fSloc);
        return { name: f.name, cc, cog, mi, volume: h.volume, sloc: fSloc };
    });

    return {
        fileName: path.basename(filePath),
        sloc,
        fnCount: fns.length,
        totalVolume: fileHalstead.volume,
        results
    };
};

// --- REPORT GENERATION ---

const generateReport = () => {
    let md = "# Codebase Ethics & Complexity Report\n\n";
    md += `Generated on: ${new Date().toLocaleString()}\n\n`;

    const summaries = [];

    TARGET_FILES.forEach(file => {
        console.log(`Analyzing ${file}...`);
        const data = analyzeFile(file);
        if (data.error) {
            md += `### !! Error analyzing ${file}: ${data.error}\n\n`;
            summaries.push({
                name: path.basename(file),
                sloc: '-',
                fns: '-',
                mi: 'Error',
                cog: 'Error',
                status: "❌ Error"
            });
            return;
        }

        const miScores = data.results.map(r => r.mi);
        const cogScores = data.results.map(r => r.cog);

        const minMI = miScores.length ? Math.min(...miScores) : 0;
        const avgMI = miScores.length ? miScores.reduce((a, b) => a + b, 0) / miScores.length : 0;
        const maxMI = miScores.length ? Math.max(...miScores) : 0;

        const minCog = cogScores.length ? Math.min(...cogScores) : 0;
        const avgCog = cogScores.length ? cogScores.reduce((a, b) => a + b, 0) / cogScores.length : 0;
        const maxCog = cogScores.length ? Math.max(...cogScores) : 0;

        summaries.push({
            name: data.fileName,
            sloc: data.sloc,
            fns: data.fnCount,
            mi: `${minMI.toFixed(1)} / ${avgMI.toFixed(1)} / ${maxMI.toFixed(1)}`,
            cog: `${minCog.toFixed(0)} / ${avgCog.toFixed(1)} / ${maxCog.toFixed(0)}`,
            avgMI,
            status: avgMI > 80 ? "✅ Excellent" : (avgMI > 65 ? "⚖️ Good" : "⚠️ Attention")
        });

        md += `## Detail: ${data.fileName}\n\n`;
        md += `| Metric | Overall Value |\n| :--- | :--- |\n`;
        md += `| **SLOC** | ${data.sloc} |\n`;
        md += `| **Function Count** | ${data.fnCount} |\n`;
        md += `| **Avg Maintainability** | **${avgMI.toFixed(2)}/100** |\n\n`;

        md += `### Top 10 High Friction Functions\n`;
        md += `| Function | Cognitive | Cyclomatic | MI | Status |\n| :--- | :--- | :--- | :--- | :--- |\n`;

        data.results
            .sort((a, b) => b.cog - a.cog)
            .slice(0, 10)
            .forEach(r => {
                const status = r.cog > 25 ? "🛑 Critical" : (r.cog > 15 ? "⚠️ High" : "✅ Clean");
                md += `| \`${r.name}\` | ${r.cog} | ${r.cc} | ${r.mi.toFixed(1)} | ${status} |\n`;
            });

        md += "\n---\n\n";
    });

    let summaryHeader = "## Executive Summary\n\n| File | Functions | Maintainability (min/avg/max) | Cognitive (min/avg/max) | Status |\n| :--- | :--- | :--- | :--- | :--- |\n";
    summaries.sort((a, b) => {
        // Optional: sort by status or name. Let's keep TARGET_FILES order if possible, or sort by name.
        return 0; // Keep order of TARGET_FILES
    }).forEach(s => {
        summaryHeader += `| \`${s.name}\` | ${s.fns} | ${s.mi} | ${s.cog} | ${s.status} |\n`;
    });

    fs.writeFileSync(path.resolve(__dirname, 'latest_metrics.md'), md.replace("# Codebase Ethics & Complexity Report", "# Metrics Report\n\n" + summaryHeader));
    console.log("Analysis complete. Report saved to latest_metrics.md");
};

generateReport();
