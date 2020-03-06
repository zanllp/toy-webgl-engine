import { CSSProperties } from 'react';

export const setCSS = (style: CSSProperties, ...ele: HTMLElement[]) => {
	ele.forEach(el => {
		Object.entries(style).forEach(([k, v]) => {
			(el.style as any)[k] = v;
		});
	});
};
export const tNumber = (n: number, fract = 2) => Number((n as number).toFixed(fract));
export const trimNumber = (d: any, fract = 2) => {
	const next = { ...d };
	Object.keys(next).forEach(x => {
		const n = next[x];
		if (typeof n === 'number') {
			next[x] = tNumber(n, fract);
		} else if (typeof n === 'object') {
			next[x] = trimNumber(n);
		}
	});
	return next;
};

const matCell = (rank: number, s: ArrayLike<number>) =>
	(row: number, col: number) => {
		return s[row * rank + col];
	};
export const modifyWindow = (willAdd: any) => {
	// tslint:disable-next-line:forin
	for (const key in willAdd) {
		(window as any)[key] = willAdd[key];
	}
};
export const printMat = (rank: number, s: ArrayLike<number>) => {
	const res: any = {};
	const c = matCell(rank, s);
	for (let index = 0; index < rank; index++) {
		res[`row${index + 1}`] = {};
		for (let i_ = 0; i_ < rank; i_++) {
			res[`row${index + 1}`][`col${i_ + 1}`] = c(index, i_);
		}
	}
	console.table(res);
};

