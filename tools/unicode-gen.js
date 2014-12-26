import Stream from 'util/Stream';
import Template from 'util/Template'

const fs = require('fs');
const derivedProp = fs.readFileSync('external/DerivedCoreProperties.txt').toString();
const uniData = fs.readFileSync('external/UnicodeData.txt').toString();
const compressMap = "01234567";

function extractDerivedProperty(tag) {
	return derivedProp
		.replace(/ |#.*/g, '')				// Remove spaces and comments
		.split("\n")						// Split into lines
		.stream()							//
		.filter(line => line.length)		// Remove empty lines
		.map(line => line.split(";"))		// Break line into two parts: code points and tag
		.filter(a => a[1] == tag)			// Filter out unneeded tags
		.flatMap(a => a[0].indexOf("..") == -1 ? [a[0], a[0]] : a[0].split(".."))
											// Change single code point to code point ranges
		.map(a => parseInt(a, 16))			// Change hexical strings into integer
		.toArray();							// Perform changes and return
}

function extractCoreProperty(tag) {
	return uniData
		.split("\n")						// Split into lines
		.stream()							//
		.filter(line => line.length)		// Remove empty lines
		.map(line => line.split(";"))		// Break line into: code points/name/category/...
		.filter(a => a[2] == tag)			// Filter out unneeded category
		.map(a => parseInt(a, 16))			// Change hexical strings into integer
		.flatMap(a => [a, a])
		.toArray();							// Perform changes and return
}

function fillTable(cache, table, val) {
	const len = table.length;
	const ret = [];
	for (let i = 0; i < len; i += 2) {
		const from = table[i];
		const to = table[i + 1];
		if (from >= cache.length) {
			ret.push(from, to);
		} else {
			for (let j = from; j <= to; j++) {
				cache[j] |= val;
			}
		}
	}
	return ret;
}

function compressTable(cache) {
	let ret = '';
	for (let i = 0; i < cache.length; i++) {
		ret += compressMap[cache[i]];
	}
	return ret;
}

let idStartTable = extractDerivedProperty('ID_Start');
let idContinueTable = extractDerivedProperty('ID_Continue');
let spaceTable = extractCoreProperty('Zs');

const cache = new Uint8Array(65536);
idStartTable = fillTable(cache, idStartTable, 1);
idContinueTable = fillTable(cache, idContinueTable, 2);
fillTable(cache, spaceTable, 4);	// According to the data now, it is []
const compressed = compressTable(cache);

const generated = Template.stringify `export var smpIdStart = ${idStartTable};
export var smpIdContinue = ${idContinueTable};
export var bmpTable = ${compressed};
`;

fs.writeFileSync('syntax/unicode/CategoryTable.js', generated);
