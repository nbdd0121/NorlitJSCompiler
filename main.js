import Context from './syntax/Context';
import Scanner from './syntax/Scanner';
import Parser from './syntax/Parser';
import TreeValidator from './syntax/TreeValidator';
import Statistics from './util/Statistics';
import Stream from './util/Stream';
import Source from './source/Source';

import BytecodeEmitter from './codegen/Bytecode';
import Generator from './codegen/Generator';

const fs = require("fs");

if (process.argv <= 1) {
	throw new TypeError('Expected file');
}
const file = fs.readFileSync(process.argv[1]).toString();

debugger;

function testCase() {
	const source = new Source(process.argv[1], file);
	const ctx = new Context();
	const syn = new Scanner(ctx, source);
	const psr = new Parser(ctx, syn);
	const module = psr.parseModule();
	new TreeValidator(ctx).visitModule(module);
	const globalEmitter = new BytecodeEmitter();
	new Generator(globalEmitter).visitModule(module);
	console.log(globalEmitter.bytecodes.join("\n"));
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

const result = time(testCase);
//console.log(JSON.stringify(result.value, null, 2));
console.log('Time: ' + result.time + 'ms');
//runTestCase(testCase, 100);
