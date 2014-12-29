import Context from 'syntax/Context';
import Scanner from 'syntax/Scanner';
const fs = require("fs");

if (process.argv <= 1) {
	throw new TypeError('Expected file');
}
const file = fs.readFileSync(process.argv[1]).toString();
const ctx = new Context();
const syn = new Scanner(ctx, file);
syn.processComments = true;

console.log(syn.nextTemplate());
console.log(syn.nextTemplateSubstitutionTail(syn.nextToken()));
// let token;
// console.time('a');
// do {
// 	console.log(token = syn.nextToken());
// } while (token.type !== 'EOF');
// console.timeEnd('a');