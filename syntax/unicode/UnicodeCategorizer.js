import {smpIdStart, smpIdContinue, bmpTable} from 'syntax/unicode/CategoryTable';

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

export function isUnicodeIdStart(codepoint) {
	if (typeof(codepoint) == 'string') {
		codepoint = codepoint.codePointAt(0);
	}
	if (codepoint >= 65535)
		return tableLookup(smpIdStart, codepoint);
	else
		return !!(compressMap.indexOf(bmpTable[codepoint]) & 1);
}

export function isUnicodeIdContinue(codepoint) {
	if (typeof(codepoint) == 'string') {
		codepoint = codepoint.codePointAt(0);
	}
	if (codepoint >= 65535)
		return tableLookup(smpIdContinue, codepoint);
	else
		return !!(compressMap.indexOf(bmpTable[codepoint]) & 2);
}

export function isUnicodeSpace(codepoint){
	if (typeof(codepoint) == 'string') {
		codepoint = codepoint.codePointAt(0);
	}
	if (codepoint >= 65535)
		return false;
	else
		return !!(compressMap.indexOf(bmpTable[codepoint]) & 4);
}
