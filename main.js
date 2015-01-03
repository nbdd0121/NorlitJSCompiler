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

function testCase() {
	const ctx = new Context();
	const syn = new Scanner(ctx, file);
	const psr = new Parser(ctx, syn);
	return psr.parseModule();
}

function time(testcase) {
	const start = Date.now();
	const value = testCase();
	return {
		time: Date.now() - start,
		value
	};
}

function runTestCase(testcase, num) {
	const data = Stream.fill(() => time(testcase).time, num).toArray();
	const meanTime = Statistics.mean(data);
	const stdev = Statistics.stdev(data, meanTime);
	console.log(`Average time for running ${num} cases is ${meanTime.toFixed(3)} ms ± ${(2 * stdev).toFixed(3)}ms`);
}

debugger;
const result = time(testCase);
debugger;
console.log(JSON.stringify(result.value, null, 2));
console.log('Time: ' + result.time + 'ms');
runTestCase(testCase, 100);
