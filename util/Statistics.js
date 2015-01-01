class Statistics {
	static sum(list) {
		let sum = 0;
		for (let a of list) {
			sum += a;
		}
		return sum;
	}
	static mean(list, sum = Statistics.sum(list)) {
		return sum / list.length;
	}
	static stdev(list, mean = Statistics.mean(list)) {
		let S = 0;
		for (let a of list) {
			S += (a - mean) * (a - mean);
		}
		return Math.sqrt(S / list.length);
	}
};

export default Statistics;