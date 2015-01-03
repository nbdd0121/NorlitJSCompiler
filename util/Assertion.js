class AssertionError extends Error {
	constructor(message) {
		this.message = message;
		if (Error.captureStackTrace)
			Error.captureStackTrace(this, AssertionError);
	}
}

Object.defineProperty(AssertionError.prototype, 'name', {
	value: 'AssertionError'
});

class Assertion {
	static assert(cond, msg = '') {
		if (!cond) {
			throw new AssertionError(msg);
		}
	}
}

export default Assertion;
