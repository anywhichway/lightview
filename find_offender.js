const fs = require('fs');
const acorn = require('acorn');
const walk = require('acorn-walk');

const file = 'lightview.js';

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
            case 'LogicalExpression': s += 1; break;
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
    score += traverse(fnNode.body, 0);
    score += findRecursion(fnNode.body);
    return score;
};

const code = fs.readFileSync(file, 'utf8');
const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script' });

const results = [];
walk.ancestor(ast, {
    FunctionDeclaration(node) {
        const name = node.id ? node.id.name : '<anonymous>';
        results.push({ name, cognitive: getCognitiveComplexity(node, name), start: node.start });
    },
    FunctionExpression(node, state, ancestors) {
        let name = '<anonymous>';
        const parent = ancestors[ancestors.length - 2];
        if (parent && parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') name = parent.id.name;
        else if (parent && parent.type === 'AssignmentExpression' && parent.left.type === 'Identifier') name = parent.left.name;
        else if (parent && parent.type === 'Property' && parent.key.name) name = parent.key.name;
        results.push({ name, cognitive: getCognitiveComplexity(node, name), start: node.start });
    },
    ArrowFunctionExpression(node, state, ancestors) {
        let name = '<anonymous>';
        const parent = ancestors[ancestors.length - 2];
        if (parent && parent.type === 'VariableDeclarator' && parent.id.name) name = parent.id.name;
        results.push({ name, cognitive: getCognitiveComplexity(node, name), start: node.start });
    }
});

results.sort((a, b) => b.cognitive - a.cognitive);
results.slice(0, 15).forEach(r => {
    const line = code.slice(0, r.start).split('\n').length;
    console.log(`${r.name} at line ${line}: ${r.cognitive}`);
});
