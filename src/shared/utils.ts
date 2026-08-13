/**
 * Capitalize the first letter of a string.
 */
export function capitalize(str: string): string {
	if (!str) return str;
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert a string to camelCase using the given separator.
 */
export function toCamelCase(str: string, separator = "-"): string {
	if (!str) return str;
	return str
		.split(separator)
		.map((word, index) => (index === 0 ? word.toLowerCase() : capitalize(word)))
		.join("");
}

/**
 * Compute the n-th Fibonacci number (n >= 0).
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
