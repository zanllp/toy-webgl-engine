import { mat3, mat4, vec2, vec3, vec4 } from 'gl-matrix';

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


export const BufferData = {
	/**
	 * 重用buffer
	 */
	reuse(gl: WebGLRenderingContext, buf: WebGLBuffer | null, size: number, location: number) {
		gl.bindBuffer(gl.ARRAY_BUFFER, buf);
		gl.enableVertexAttribArray(location);
		gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
	},
	/**
	 * 从新的数据创建buffer
	 */
	write(gl: WebGLRenderingContext, data: Iterable<number>, size: number, location: number) {
		const buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(location);
		gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
		return buf;
	}
};
export const degToRad = (d: number) => {
	return d * Math.PI / 180;
};

type typeAll = mat3 | mat4 | vec4 | vec3 | vec2 | number;
type constraintNull = { [x: string]: number };
type constraintAll = { [x: string]: typeAll | null };
const createSetUniformFn = (gl: WebGLRenderingContext, loc: WebGLUniformLocation | null) => {
	return (_: typeAll, trans = false) => {
		if (typeof _ === 'number') {
			gl.uniform1f(loc, _);
		} else {
			// 没有mat2因为不能和vec4区分
			// 不使用instanceof是因为mat,vec的类型有类，但实际是模块而是构造器
			switch (_.length) {
				case 2:
					gl.uniform2f(loc, _[0], _[1]);
					break;
				case 3:
					gl.uniform3f(loc, _[0], _[1], _[2]);
					break;
				case 4:
					gl.uniform4f(loc, _[0], _[1], _[2], _[3]);
					break;
				case 9:
					gl.uniformMatrix3fv(loc, trans, _);
					break;
				case 16:
					gl.uniformMatrix4fv(loc, trans, _);
					break;
				default:
					throw new Error('未定义类型');
			}
		}

	};
};

type unifType<U> = { [p in keyof U]: U[p] };
const programInfoFromKey = <A extends constraintNull, U extends constraintAll>({ gl, program, attribute, uniform }:
	{ gl: WebGLRenderingContext; program: WebGLProgram; attribute: A; uniform: U; }) => {
	gl.useProgram(program);
	const loc = {} as { [p in keyof A]: number } & { [p in keyof U]: WebGLUniformLocation | null };
	const res = {} as { program: WebGLProgram; loc: typeof loc; src: A & U } & unifType<U> & { [p in keyof A]: Array<number> }; // 如果定义在一个即将展开的对象上,setget生效
	Object.keys(attribute).forEach(x => {
		(loc as any)[x] = gl.getAttribLocation(program, x);
		const size = attribute[x];
		let data = new Array<number>();
		let buf: WebGLBuffer | null = null;
		Object.defineProperty(res, x, {
			set(_: any) {
				if (data !== _) {
					(data as any) = null;
					data = _;
					buf = BufferData.write(gl, data, size, loc[x]);
				} else {
					BufferData.reuse(gl, buf, size, loc[x]);
				}
			},
			get() {
				return data;
			}
		});
	});
	Object.keys(uniform).forEach(x => {
		const uloc = gl.getUniformLocation(program, x);
		const eset = createSetUniformFn(gl, uloc);
		Object.defineProperty(res, x, {
			set(_: any) {
				eset(_);
			},
			get() {
				return gl.getUniform(program, uloc as any);
			}
		});
		const initValue = uniform[x];
		if (initValue) {
			(res as any)[x] = initValue; // 初始化设定值
		}
		(loc as any)[x] = uloc;
	});
	res.program = program;
	res.loc = loc;
	res.src = { ...attribute, ...uniform };
	return res;
};
export type programInfoT = ReturnType<typeof programInfoFromKey>;


export type programInfoParamsT<A, U> = {
	gl: WebGLRenderingContext;
	location: {
		attribute: A;
		uniform: U;
	},
	source: {
		vertex: string;
		fragment: string;
	}
};


export const createProgramInfo = <A extends constraintNull, U extends constraintAll>({ gl, location, source }: programInfoParamsT<A, U>) => {
	const program = createProgram(gl, source.vertex, source.fragment);
	return programInfoFromKey({ gl, program, attribute: location.attribute, uniform: location.uniform });
};

export type setVParamsType<V> = (Partial<V> | ((s: V) => Partial<V>) | { action: 'incr' | 'decr', key: keyof V, value: number });
export const createSetValueFn = <T, V, U extends { value: V }>(gl: WebGLRenderingContext, programInfo: T, render: (gl: WebGLRenderingContext, info: T, v?: V) => any, state: U) => {
	const throttleRender = throttle((s: U) => render(gl, programInfo, s.value), 1000 / 60);
	return (s: setVParamsType<V>) => {
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
		throttleRender(state);
		return value;
	};
};

export const array2Vec3 = (_: Array<number>) => vec3.fromValues(_[0], _[1], _[2]);

type PosDataType = number[][];
export const flatPos = (data: PosDataType) => {
	return data.flat(1);
};

export const randColor = (posData: PosDataType, factor = 1) => {
	const colorData = posData.map(() => {
		let color = Array.from(vec3.random(vec3.create()).map(Math.abs));
		if (factor !== 1) {
			color = color.map(_ => _ * factor);
		}
		return [color, color, color, color, color, color];
	}).flat(2);
	return colorData;
};

/**
 * 计算表面法线
 */
export const calcNormal = (posData: PosDataType) => {
	return posData.map((x) => {
		const e = [[x[0], x[1], x[2]], [x[3], x[4], x[5]], [x[6], x[7], x[8]]];
		const v1 = vec3.sub(vec3.create(), e[1], e[0]);
		const v2 = vec3.sub(vec3.create(), e[2], e[0]);
		const normal = vec3.cross(vec3.create(), v1, v2);
		vec3.normalize(normal, normal);
		const res = Array.from(normal);
		return [res, res, res, res, res, res]; // 一个面2个三角形6个点
	}).flat(2);
};
type Info = {
	a_pos: Array<number>;
	a_normal?: Array<number>;
	a_color?: Array<number>;
	u_model?: mat4;
	u_proj: mat4;
	u_view: mat4;
	src: any
};
export class Model {
	constructor(data: PosDataType) {
		this.data = data;
		this.dataFlat = data.flat();
		this.normal = calcNormal(this.data);
	}
	public readonly data: PosDataType;
	public readonly dataFlat: Array<number>;
	public readonly normal: Array<number>;
	public modelMat?: mat4;
	public color = new Array<number>();
	public fillRandColor(factor = 1) {
		this.color = randColor(this.data, factor);
	}
	public render(gl: WebGLRenderingContext) {
		gl.drawArrays(gl.TRIANGLES, 0, this.dataFlat.length / 3);
	}
	public setModelMat(fn: (_: mat4) => mat4 | void) {
		const mat = mat4.create();
		const res = fn(mat);
		if (res) {
			this.modelMat = res;
		} else {
			this.modelMat = mat;
		}
		return this.modelMat;
	}

}
/**
 * rect2triangle,将一个矩形展开成2个三角形
 * @param rect 逆时针顺序的矩形
 */
const r2t = (rect: Array<number>) => {
	for (let i = 0; i < 3; i++) {
		rect[5 * 3 + i] = rect[3 * 3 + i];
	}
	for (let i = 0; i < 3; i++) {
		rect[4 * 3 + i] = rect[2 * 3 + i];
	}
	for (let i = 0; i < 3; i++) {
		rect[3 * 3 + i] = rect[i];
	}
	return rect;
};

export class Box extends Model {
	public constructor({ x = 100, y = 100, z = 100 }: { x?: number; y?: number; z?: number; } = {}) {
		const data = [
			// front
			r2t([x, y, z,
				0, y, z,
				0, 0, z,
				x, 0, z,]),
			// back
			r2t([x, y, 0,
				x, 0, 0,
				0, 0, 0,
				0, y, 0,]),
			// right
			r2t([x, y, z,
				x, 0, z,
				x, 0, 0,
				x, y, 0]),
			//left
			r2t([0, y, z,
				0, y, 0,
				0, 0, 0,
				0, 0, z,]),
			//top
			r2t([x, y, 0,
				0, y, 0,
				0, y, z,
				x, y, z,]),
			//bottom
			r2t([0, 0, 0,
				x, 0, 0,
				x, 0, z,
				0, 0, z,]),
		];
		super(data);
	}
	public fillColor({ front, back, right, left, top, bottom }:
		{ front: number[]; back: number[]; right: number[]; left: number[]; top: number[]; bottom: number[]; }) {
		this.color = [front, back, right, left, top, bottom].map(c => [c, c, c, c, c, c]).flat(2);
	}
}

type latLong = {
	start: number;
	end: number;
	sub: number;
};
export class Sphere extends Model {
	/**
	 * 球体，面数 = 2 x latitude.sub x longitube.sub，默认1800面
	 * @param radius 半径
	 * @param latitude 维度相关
	 * @param longitude 经度相关
	 */
	public constructor({ radius = 100, latitude, longitude }: { radius?: number; latitude?: Partial<latLong>; longitude?: Partial<latLong>; } = {}) {
		const lat = { start: degToRad(90), end: degToRad(-90), sub: 30, ...latitude };
		const long = { start: 0, end: degToRad(360), sub: 30, ...longitude };
		const pos = new Array<Array<Array<number>>>();
		const latStep = (lat.end - lat.start) / lat.sub;
		const longStep = (long.end - long.start) / long.sub;
		for (let i = 0; i < lat.sub + 1; i++) {
			const posFloor = new Array<Array<number>>();
			for (let ii = 0; ii < long.sub + 1; ii++) {
				const latRad = lat.start + latStep * i;
				const longRad = long.start + longStep * ii;
				const x = radius * Math.cos(latRad) * Math.sin(longRad);
				const z = radius * Math.cos(latRad) * Math.cos(longRad);
				const y = radius * Math.sin(latRad);
				posFloor.push([x, y, z]);
			}
			pos.push(posFloor);
		}
		const data = new Array<Array<number>>();
		const p = pos;
		for (let i = 0; i < p.length - 1; i++) {
			for (let ii = 0; ii < p[i].length - 1; ii++) {
				data.push(r2t([
					...p[i][ii + 1],
					...p[i][ii],
					...p[i + 1][ii],
					...p[i + 1][ii + 1],
				]));
			}

		}
		super(data);
	}
	/**
	 * 填充颜色
	 * @param color vec4或者vec3 (0 -> 255)
	 */
	public fillColor(...color: number[]) {
		color = color.map(_ => _ / 255);
		// 一个面2个三角形
		for (let i = 0; i < this.data.length * 2 * 3; i++) {
			this.color.push(...color);
		}
	}
}

export class Mesh extends Model {
	public constructor({ range = 1500, num = 10, is3d = false }: { range?: number; num?: number; is3d?: boolean; }) {
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
			return x.map(x => x *= range);
		});
		super(dst);
		this.size = is3d ? 3 : 2;
	}
	public size: number;
	public render(gl: WebGLRenderingContext) {
		gl.drawArrays(gl.LINES, 0, this.dataFlat.length / this.size);
	}
}

export class Point extends Model {
	public constructor(x: number, y: number, z: number) {
		super([[x, y, z]]);
	}
	public render(gl: WebGLRenderingContext) {
		gl.drawArrays(gl.POINTS, 0, 1);
	}
}

export class Scene<T extends Info> {
	public constructor(...models: Array<Model>) {
		this.models.push(...models);
	}
	private projectionMat = mat4.create();
	private viewMat = mat4.create();
	private models = new Array<Model>();
	public render(gl: WebGLRenderingContext, info: T) {
		info.u_proj = this.projectionMat;
		info.u_view = this.viewMat;
		this.models.forEach(x => {
			if (x.modelMat && info.src['u_model']) {
				info.u_model = x.modelMat;
			}
			if (info.src['a_color']) { // 查看是否定义了这个attribute，比info.a_color速度更快
				info.a_color = x.color;
			}
			if (info.src['a_normal']) {
				info.a_normal = x.normal;
			}
			info.a_pos = x.dataFlat;

			x.render(gl);
		});
	}
	public addModel(...model: Model[]) {
		this.models.push(...model);
	}
	public setProjectionMat(fn: ((_: mat4) => mat4 | void) | mat4) {
		if (typeof fn === 'function') {
			const mat = mat4.create();
			const res = fn(mat);
			if (res) {
				this.projectionMat = res;
			} else {
				this.projectionMat = mat;
			}
		} else {
			this.projectionMat = fn;
		}
		return this.projectionMat;
	}
	public setViewMat(fn: ((_: mat4) => mat4 | void) | mat4) {
		if (typeof fn === 'function') {
			const mat = mat4.create();
			const res = fn(mat);
			if (res) {
				this.viewMat = res;
			} else {
				this.viewMat = mat;
			}
		} else {
			this.viewMat = fn;
		}
		return this.viewMat;
	}
}

/**
 * 防抖
 * @param func 被包装函数
 * @param delay 延时，默认 300ms
 */
export const debounce = (func: (...args: any[]) => any, delay: number = 300) => {
	let interval = -1;
	return (...args: any[]) => {
		if (interval !== -1) {
			clearInterval(interval);
		}
		interval = setTimeout(() => func(...args), delay) as any;
	};
};
/**
 * 阀值
 * @param func 被包装函数
 * @param delay 延时，默认 300ms
 */
export const throttle = (func: (...args: any[]) => any, threshold: number = 300) => {
	let lastT = 0;
	return (...args: any[]) => {
		if (lastT === 0 || Date.now() - lastT > threshold) {
			lastT = Date.now();
			func(...args);
		}
	};
};


export type actionsType<V> = ((tDiff: number) => setVParamsType<V>) | { action: (tDiff: number) => setVParamsType<V>, once?: boolean };
export const createKeyListener = <V>(actions: { [x: string]: actionsType<V> }) => {
	const keyPressing = new Set<string>();
	document.addEventListener('keydown', x => keyPressing.add(x.code));
	document.addEventListener('keyup', x => keyPressing.delete(x.code));
	let lastT = 0;
	const loop = (t: number) => {
		keyPressing.forEach((k) => {
			const p = actions[k as any];
			if (p) {
				if (typeof p === 'function') {
					p(t - lastT);
				} else {
					const { once, action } = p;
					action(t - lastT);
					if (once) { // 只执行一次
						keyPressing.delete(k);
					}
				}
			}
		});
		lastT = t;
		requestAnimationFrame(loop);
	};
	loop(16.6);
};