import { mat3 } from 'gl-matrix';

export function resize(canvas: any) {
	// 获取浏览器中画布的显示尺寸
	let displayWidth = canvas.clientWidth;
	let displayHeight = canvas.clientHeight;

	// 检尺寸是否相同
	if (canvas.width !== displayWidth ||
		canvas.height !== displayHeight) {

		// 设置为相同的尺寸
		canvas.width = displayWidth;
		canvas.height = displayHeight;
	}
}

export function createShader({ gl, type, source }: { gl: WebGLRenderingContext; type: number; source: string; }) {
	var shader = gl.createShader(type);
	if (!shader) {
		throw new Error('shader err');
	}
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
	if (!success) {
		const msg = gl.getShaderInfoLog(shader);
		console.log(msg);
		gl.deleteShader(shader);
		throw new Error(`'createShader !success' ${msg}`);
	}
	return shader;
}
export const createProgramQuery = (gl: WebGLRenderingContext, vertex: string, fragment: string) => {
	return createProgram(gl, document.querySelector(vertex)!.textContent!, document.querySelector(fragment)!.textContent!);
};
export function createProgram(gl: WebGLRenderingContext, vertexSrc: string, fragmentSrc: string) {
	var program = gl.createProgram();
	if (!program) {
		throw new Error('! program');
	}
	gl.attachShader(program, createShader({ gl, type: gl.VERTEX_SHADER, source: vertexSrc }));
	gl.attachShader(program, createShader({ gl, type: gl.FRAGMENT_SHADER, source: fragmentSrc }));
	gl.linkProgram(program);
	var success = gl.getProgramParameter(program, gl.LINK_STATUS);
	if (!success) {
		const msg = gl.getProgramInfoLog(program);
		console.log(msg);
		gl.deleteProgram(program);
		throw new Error(`createProgram( !success ${msg}`);
	}
	return program;
}
const matCell = (rank: number, s: ArrayLike<number>) =>
	(row: number, col: number) => {
		return s[row * rank + col];
	};
export const mulM3V3 = (m: mat3, v: number[]) => {
	const c = matCell(3, m);
	const x = c(0, 0) * v[0] + c(0, 1) * v[1] + c(0, 2) * v[2];
	const y = c(1, 0) * v[0] + c(1, 1) * v[1] + c(1, 2) * v[2];
	const z = c(2, 0) * v[0] + c(2, 1) * v[1] + c(2, 2) * v[2];
	return [x, y, z];
};

export const mulV3M3 = (v: number[], m: mat3) => {
	const c = matCell(3, m);
	const x = c(0, 0) * v[0] + c(1, 0) * v[1] + c(2, 0) * v[2];
	const y = c(0, 1) * v[0] + c(1, 1) * v[1] + c(2, 1) * v[2];
	const z = c(0, 1) * v[0] + c(1, 2) * v[1] + c(2, 2) * v[2];
	return [x, y, z];
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
export const createWriteBufFn = (gl: WebGLRenderingContext) => {
	const fn = (data: Iterable<number>, size: number, location: number) => {
		writeBufferData(gl, data, size, location);
		return fn;
	};
	return fn;
};
export const writeMultiBuf = (gl: WebGLRenderingContext, p: { data: Iterable<number>; size: number; location: number }[]) => {
	p.forEach(x => writeBufferData(gl, x.data, x.size, x.location));
};

export const writeBufferData = (gl: WebGLRenderingContext, data: Iterable<number>, size: number, location: number) => {
	const buf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
	gl.enableVertexAttribArray(location);
	gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
};
export const degToRad = (d: number) => {
	return d * Math.PI / 180;
};
export function createMesh({ gl, posLoc, range = 1500, num = 10, is3d = false }: { gl: WebGLRenderingContext; posLoc: number; range?: number; num?: number; is3d?: boolean; }) {
	const data = [] as number[][];
	// 0 -> 1
	for (let i = 0; i < num + 1; i++) {
		const leftRow = [0, i / num];
		const rightRow = [1, i / num];
		const topCol = [i / num, 1];
		const bottomCol = [i / num, 0];
		data.push(leftRow, rightRow, topCol, bottomCol);
	}
	const dst = data.map((x) => {
		x[0] -= 0.5;
		x[1] -= 0.5;
		if (is3d) {
			x[2] = x[1];
			x[1] = 0;
		}
		return x;
	}).flat(2).map(x => x *= range);
	const size = is3d ? 3 : 2;
	writeBufferData(gl, dst, size, posLoc);
	gl.drawArrays(gl.LINES, 0, dst.length / size);
	return dst.length / size;
}
const programInfoFromKey = <A, U>({ gl, program, attribute, uniform }: { gl: WebGLRenderingContext; program: WebGLProgram; attribute: A; uniform: U; }) => {
	const attr = {} as { [p in keyof A]: number };
	Object.keys(attribute).forEach(x => (attr as any)[x] = gl.getAttribLocation(program, x));
	const unif = {} as { [p in keyof U]: WebGLUniformLocation | null };
	Object.keys(uniform).forEach(x => (unif as any)[x] = gl.getUniformLocation(program, x));
	return { program, ...attr, ...unif };
};
export type programInfoT<A, U> = {
	program: WebGLProgram;
} & { [p in keyof A]: number; } & { [p in keyof U]: WebGLUniformLocation | null; };


export type programInfoParamsT<A, U> = { gl: WebGLRenderingContext; location: { attribute: A; uniform: U; }, source: { vertex: string; fragment: string; } };


export const createProgramInfo = <A, U>({ gl, location, source }: programInfoParamsT<A, U>) => {
	const program = createProgram(gl, source.vertex, source.fragment);
	return programInfoFromKey({ gl, program, attribute: location.attribute, uniform: location.uniform });
};

export const createSetValueFn = <T, V, U extends { value: V }>(gl: WebGLRenderingContext, programInfo: T, render: (gl: WebGLRenderingContext, info: T, v?: V) => any, state: U) =>
	(s: (Partial<V> | ((s: V) => Partial<V>) | { action: 'incr' | 'decr', key: keyof V, value: number })) => {
		let { value } = state;
		if (typeof s === 'object') {
			if ('action' in s) {
				const v = value as any;
				if (typeof v[s.key] !== 'number') {
					throw new Error(`key:${s.key} 不能作用于value:${value},type:${typeof v[s.key]}`);
				}
				switch (s.action) {
					case 'incr':
						v[s.key] += s.value;
						break;
					case 'decr':
						v[s.key] -= s.value;
						break;
				}
			} else {
				value = { ...value, ...s };
			}
		} else {
			value = { ...value, ...s(value) };
		}
		state.value = value;
		render(gl, programInfo, value);
		return value;
	};