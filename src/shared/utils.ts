/**
 * 将字符串的首字母大写
 */
export function capitalize(str: string): string {
	if (!str) return str;
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 将字符串按指定分隔符转为驼峰命名
 */
export function toCamelCase(str: string, separator = "-"): string {
	if (!str) return str;
	return str
		.split(separator)
		.map((word, index) => (index === 0 ? word.toLowerCase() : capitalize(word)))
		.join("");
}

/**
 * 计算斐波那契数列的第 n 项（n >= 0）
 */
export function fibonacci(n: number): number {
	if (n < 0) throw new Error("n must be non-negative");
	if (n <= 1) return n;
	let a = 0,
		b = 1;
	for (let i = 2; i <= n; i++) {
		[a, b] = [b, a + b];
	}
	return b;
}
