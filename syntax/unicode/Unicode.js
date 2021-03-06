import {smpIdStart, smpIdContinue, bmpTable} from './CategoryTable';

const compressMap = "01234567";

function tableLookup(table, codepoint) {
	let i = 0;
	while (true) {
		if (codepoint < table[i++]) {
			return false;
		}
		if (codepoint <= table[i++]) {
			return true;
		}
	}
	return false;
}

export default class Unicode {
	static isIdStart(codepoint) {
		if (typeof(codepoint) == 'string') {
			codepoint = codepoint.codePointAt(0);
		}
		if (codepoint >= 65535)
			return tableLookup(smpIdStart, codepoint);
		else
			return !!(compressMap.indexOf(bmpTable[codepoint]) & 1);
	}
	static isIdContinue(codepoint) {
		if (typeof(codepoint) == 'string') {
			codepoint = codepoint.codePointAt(0);
		}
		if (codepoint >= 65535)
			return tableLookup(smpIdContinue, codepoint);
		else
			return !!(compressMap.indexOf(bmpTable[codepoint]) & 2);
	}
	static isSpace(codepoint) {
		if (typeof(codepoint) == 'string') {
			codepoint = codepoint.codePointAt(0);
		}
		if (codepoint >= 65535)
			return false;
		else
			return !!(compressMap.indexOf(bmpTable[codepoint]) & 4);
	}
}
