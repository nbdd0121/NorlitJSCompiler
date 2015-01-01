import Context from 'syntax/Context';
import Scanner from 'syntax/Scanner';
import Parser from 'syntax/Parser';
import Statistics from 'util/Statistics';
import Stream from 'util/Stream';
const fs = require("fs");

if (process.argv <= 1) {
	throw new TypeError('Expected file');
}
const file = fs.readFileSync(process.argv[1]).toString();
const ctx = new Context();
const syn = new Scanner(ctx, file);
const psr = new Parser(ctx, syn);
syn.processComments = true;

console.time('a');
const script = psr.parseScript();
console.log(JSON.stringify(script, null, 2));
console.timeEnd('a');

// benchmark
function testCase() {
	const ctx = new Context();
	const syn = new Scanner(ctx, file);
	const psr = new Parser(ctx, syn);
	psr.parseScript();
}

function runTestCase(testcase, num) {
	const data = Stream.fill(() => {
		const start = Date.now();
		testCase();
		return Date.now() - start;
	}, num).toArray();
	const meanTime = Statistics.mean(data);
	const stdev = Statistics.stdev(data, meanTime);
	console.log(`Average time for running ${num} cases is ${meanTime} ms ± ${Math.round(2 * stdev * 10) / 10}ms`);
}


runTestCase(testCase, 1000);