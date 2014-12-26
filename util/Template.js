class Template {
	static default(temp, ...sub) {
		return String.raw({raw: temp}, ...sub);
	}
	static stringify(temp, ...sub) {
		for (let i = 0; i < sub.length; i++) {
			sub[i] = JSON.stringify(sub[i]);
		}
		return this.default(temp, ...sub);
	}
}

export default Template;