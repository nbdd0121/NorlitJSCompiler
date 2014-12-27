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

class Descriptor {
	static isOptional(desc) {
		return (desc[0] == '[' && desc[desc.length - 1] == ']');
	}
	static unboxOptional(desc) {
		return desc.slice(1, -1);
	}
}

class Assertion {
	static checkArguments(args, ...types) {
		for (let i = 0; i < types.length; i++) {
			let type = types[i];
			if (Descriptor.isOptional(type)) {
				if (args.length <= i) {
					continue;
				}
				type = Descriptor.unboxOptional(type);
			} else {
				if (args.length <= i) {
					throw new TypeError('Cannot omit argument of type ' + a);
				}
			}
			this.checkType(args[i], type);
		}
	}
	static checkType(obj, type) {
		if (typeof(obj) == type) {
			return;
		}
		throw new TypeError('Expected type ' + type);
	}
	static string(arg) {
		this.assert(typeof(arg) === 'string', 'String expected');
	}
	static assert(cond, msg = '') {
		if (!cond) {
			throw new AssertionError(msg);
		}
	}
}

export default Assertion;