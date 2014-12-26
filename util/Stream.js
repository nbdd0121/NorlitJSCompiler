class Stream {
	constructor(content) {
		this._content = content;
		if(!this[Symbol.iterator]){
			throw TypeError('Illegal constructor new Stream');
		}
	}
	static from(arr) {
		if (!arr[Symbol.iterator]) {
			arr = Array.from(arr);
		}
		return new ArrayStream(arr);
	}
	filter(callback) {
		return new FilterStream(this, callback);
	}
	map(callback) {
		return new MapStream(this, callback);
	}
	flatMap(callback) {
		return new FlatMapStream(this, callback);
	}
	forEach(callback) {
		for (var item of this) {
			callback(item);
		}
	}
	toArray() {
		return Array.from(this);
	}
}

class ArrayStream extends Stream {
	constructor(content) {
		super(content);
	} 
	*[Symbol.iterator]() {
		yield* this._content;
	}
}

class FilterStream extends Stream {
	constructor(stream, callback) {
		super(stream);
		this._callback = callback;
	}
	*[Symbol.iterator]() {
		for (var entry of this._content) {
			if (this._callback(entry)) {
				yield entry;
			}
		}
	}
}

class MapStream extends Stream {
	constructor(stream, callback) {
		super(stream);
		this._callback = callback;
	}
	*[Symbol.iterator]() {
		for (var entry of this._content) {
			yield this._callback(entry);
		}
	}
}

class FlatMapStream extends Stream {
	constructor(stream, callback) {
		super(stream);
		this._callback = callback;
	}
	*[Symbol.iterator]() {
		for (var entry of this._content) {
			yield* this._callback(entry);
		}
	}
}

Object.defineProperty(Array.prototype, "stream", {
	value: function() {
		return Stream.from(this);
	}
});

export default Stream;