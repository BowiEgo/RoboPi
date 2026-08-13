/**
 * Promise tracker for correlating IPC request/response pairs.
 *
 * Each outgoing IPC request gets a unique id; the corresponding response
 * settles (or fails) the promise registered for that id. This decouples
 * fire-and-forget IPC sends from the async handlers that await them.
 */

class Deferred<T = void> {
	resolve!: (value: T) => void;
	reject!: (error: Error) => void;
	promise: Promise<T>;

	constructor() {
		this.promise = new Promise<T>((res, rej) => {
			this.resolve = res;
			this.reject = rej;
		});
	}
}

const pending = new Map<string, Deferred<unknown>>();

/** Register a pending request and return a promise resolved by settle/fail. */
export function track<T>(id: string): Promise<T> {
	const d = new Deferred<T>();
	pending.set(id, d as Deferred<unknown>);
	return d.promise;
}

/** Resolve the pending request with the given value. */
export function settle(id: string, value?: unknown) {
	const d = pending.get(id);
	if (d) {
		pending.delete(id);
		d.resolve(value);
	}
}

/** Reject the pending request with an error. */
export function fail(id: string, error: Error) {
	const d = pending.get(id);
	if (d) {
		pending.delete(id);
		d.reject(error);
	}
}
