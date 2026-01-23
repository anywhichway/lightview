// Test preprocessXPath function
import { parseCDOMC } from './jprx/parser.js';

const testInput = `{
  button: {
    id: "7",
    children: [#../@id]
  }
}`;

console.log('Test input:', testInput);

try {
    const result = parseCDOMC(testInput);
    console.log('Parsed successfully:', result);
} catch (e) {
    console.error('Parse failed:', e.message);
}
