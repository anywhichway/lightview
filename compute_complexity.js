const fs = require('fs');
const acorn = require('acorn');
const walk = require('acorn-walk');

const files = ['lightview.js', 'lightview-x.js', 'lightview-router.js'];

const getComplexity = (fnNode) => {
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
            if (node.operator === '&&' || node.operator === '||' || node.operator === '??') {
                complexity++;
            }
            c(node.left, state);
            c(node.right, state);
        },
        SwitchCase(node, state, c) {
            if (node.test) complexity++;
            if (node.test) c(node.test, state);
            node.consequent.forEach(n => c(n, state));
        },
        CatchClause(node, state, c) { 
            complexity++; 
            if (node.param) c(node.param, state);
            c(node.body, state); 
        },
        FunctionDeclaration() {},
        FunctionExpression() {},
        ArrowFunctionExpression() {}
    });
    return complexity;
};

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    
    const code = fs.readFileSync(file, 'utf8');
    const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script' });
    const functions = [];

    walk.ancestor(ast, {
        FunctionDeclaration(node, state, ancestors) {
            functions.push({ node, name: node.id ? node.id.name : '<anonymous>' });
        },
        FunctionExpression(node, state, ancestors) {
            let name = '<anonymous>';
            const parent = ancestors[ancestors.length - 2];
            if (parent && parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
                name = parent.id.name;
            } else if (parent && parent.type === 'AssignmentExpression' && parent.left.type === 'Identifier') {
                name = parent.left.name;
            } else if (parent && parent.type === 'Property' && parent.key.type === 'Identifier') {
                name = parent.key.name;
            }
            functions.push({ node, name });
        },
        ArrowFunctionExpression(node, state, ancestors) {
            let name = '<anonymous>';
            const parent = ancestors[ancestors.length - 2];
            if (parent && parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
                name = parent.id.name;
            } else if (parent && parent.type === 'AssignmentExpression' && parent.left.type === 'Identifier') {
                name = parent.left.name;
            } else if (parent && parent.type === 'Property' && parent.key.type === 'Identifier') {
                name = parent.key.name;
            }
            functions.push({ node, name });
        }
    });

    const results = functions.map(fn => ({
        name: fn.name,
        complexity: getComplexity(fn.node)
    }));

    if (results.length === 0) {
        console.log(`--- ${file} ---`);
        console.log('No functions found.');
        return;
    }

    const complexities = results.map(r => r.complexity);
    const min = Math.min(...complexities);
    const max = Math.max(...complexities);
    const avg = complexities.reduce((a, b) => a + b, 0) / complexities.length;

    console.log(`--- ${file} ---`);
    console.log(`Total functions: ${results.length}`);
    console.log(`Min: ${min}`);
    console.log(`Max: ${max}`);
    console.log(`Avg: ${avg.toFixed(2)}`);
    console.log('');
});
