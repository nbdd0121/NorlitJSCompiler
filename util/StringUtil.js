class StringUtil{
	static repeat(str, count) {
		count = parseInt(count);
		if (count < 1)
			return '';
		let result = '';
		while (count > 1) {
			if (count & 1) result += str;
			count >>= 1, str += str;
		}
		return result + str;
	}

}

export default StringUtil;