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
type attrResType = { set(data: Array<number>, id?: any): void, get(id: any): Array<number> | undefined };
type attrType<A> = { [p in keyof A]: attrResType };
const programInfoFromKey = <A extends constraintNull, U extends constraintAll>({ gl, program, attribute, uniform }:
	{ gl: WebGLRenderingContext; program: WebGLProgram; attribute: A; uniform: U; }) => {
	gl.useProgram(program);
	const loc = {} as { [p in keyof A]: number } & { [p in keyof U]: WebGLUniformLocation | null };
	const res = {} as { program: WebGLProgram; loc: typeof loc; src: A & U } & unifType<U> & attrType<A>; // 如果定义在一个即将展开的对象上,setget生效
	Object.keys(attribute).forEach(x => {
		(loc as any)[x] = gl.getAttribLocation(program, x);
		const size = attribute[x];
		const idRec = new Map<any, { d: Array<number>; b: WebGLBuffer | null }>();
		(res as any)[x] = {
			get(id: any) {
				return idRec.get(id) && idRec.get(id)!.d;
			},
			set(data: any, id?: any) {
				if (id === undefined) {
					BufferData.write(gl, data, size, loc[x]);
				} else {
					if (idRec.get(id) && idRec.get(id)!.d === data) { // 可以重用数据
						BufferData.reuse(gl, idRec.get(id)!.b, size, loc[x]);
					} else {
						const b = BufferData.write(gl, data, size, loc[x]);
						idRec.set(id, { d: data, b });
					}
				}
			}
		};
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
	a_pos: attrResType;
	a_normal?: attrResType;
	a_color?: attrResType;
	u_model?: mat4;
	u_proj: mat4;
	u_view: mat4;
	src: any
};
export class Model {
	constructor(data: PosDataType) {
		this.data = data;
		if (Model.memoPosfNormal.has(this.data)) {
			const d = Model.memoPosfNormal.get(this.data);
			this.dataFlat = d!.d;
			this.normal = d!.n;
		} else {
			this.dataFlat = data.flat();
			this.normal = calcNormal(this.data);
			Model.memoPosfNormal.set(this.data, { d: this.dataFlat, n: this.normal });
		}
	}
	public readonly data: PosDataType;
	public readonly dataFlat: Array<number>;
	public readonly normal: Array<number>;
	public readonly children = new Set<Model>();
	public readonly matrixStack = new Array<mat4>();
	public modelMat = mat4.create();
	public color = new Array<number>();
	static memoPosfNormal = new Map<PosDataType, { d: Array<number>, n: Array<number> }>();

	public fillRandColor(factor = 1) {
		this.color = randColor(this.data, factor);
	}
	public render(gl: WebGLRenderingContext) {
		gl.drawArrays(gl.TRIANGLES, 0, this.dataFlat.length / 3);
	}
	public setModelMat(fn: ((_: mat4) => mat4 | void) | mat4) {
		if (typeof fn === 'function') {
			const mat = mat4.create();
			const res = fn(mat);
			if (res) {
				this.modelMat = res;
			} else {
				this.modelMat = mat;
			}
		} else {
			this.modelMat = fn;
		}
		return this.modelMat;
	}
	public pushMat(mat: mat4) {
		this.matrixStack.push(mat);
		mat4.mul(this.modelMat, this.modelMat, mat);
	}
	public popMat() {
		const mat = this.matrixStack.pop();
		if (mat) {
			mat4.invert(mat, mat);
			mat4.mul(this.modelMat, this.modelMat, mat);
		}
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
	public constructor({ x = 100, y = 100, z = 100, color = 'none' }:
		{ x?: number; y?: number; z?: number; color?: 'none' | 'rand' | { front: number[]; back: number[]; right: number[]; left: number[]; top: number[]; bottom: number[]; } } = {}) {
		const str = JSON.stringify({ x, y, z });
		if (Box.memoPos.has(str)) {
			super(Box.memoPos.get(str)!);
		} else {
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
			Sphere.memoPos.set(str, data);
		}

		if (color === 'rand') {
			this.fillRandColor();
		}
		if (typeof color === 'object') {
			this.fillColor(color);
		}
	}
	static memoPos = new Map<string, PosDataType>();
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
	public constructor({ radius = 100, latitude, longitude, color = 'none' }:
		{ radius?: number; latitude?: Partial<latLong>; longitude?: Partial<latLong>; color?: 'none' | 'rand' | Array<number> } = {}) {
		const str = JSON.stringify({ radius, latitude, longitude });
		if (Sphere.memoPos.has(str)) {
			super(Sphere.memoPos.get(str)!);
		} else {
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
			Sphere.memoPos.set(str, data);
		}
		if (color === 'rand') {
			this.fillRandColor();
		} else if (color instanceof Array) {
			this.fillColor(...color);
		}
	}

	static memoPos = new Map<string, PosDataType>();
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

/**
 * 组合体
 */
export class Assembly extends Model {
	public constructor(...models: Array<Model>) {
		super([[]]);
		for (const i of models) {
			this.color = [...this.color, ...i.color];
			if (i.modelMat) {
				for (let ii = 0; ii < i.normal.length; ii += 3) {
					const pos = vec3.fromValues(i.dataFlat[ii], i.dataFlat[ii + 1], i.dataFlat[ii + 2]);
					this.dataFlat.push(...Array.from(vec3.transformMat4(vec3.create(), pos, i.modelMat)));
					const normal = vec3.fromValues(i.normal[ii], i.normal[ii + 1], i.normal[ii + 2]);
					this.normal.push(...Array.from(vec3.transformMat4(vec3.create(), normal, i.modelMat)));
				}
			} else {
				this.dataFlat.push(...i.dataFlat);
				this.normal.push(...i.normal);
			}
		}
	}
	public readonly dataFlat = new Array<number>();
	public readonly normal = new Array<number>();
	public readonly color = new Array<number>();
}

export class Scene<T extends Info> {
	public constructor(...models: Array<Model>) {
		this.models.push(...models);
	}
	private projectionMat = mat4.create();
	private viewMat = mat4.create();
	private models = new Array<Model>();
	public render(gl: WebGLRenderingContext, info: T, next?: { modelMat: mat4, child: Model }) {
		if (!next) {
			info.u_proj = this.projectionMat;
			info.u_view = this.viewMat;
			this.models.forEach(x => {
				if (x.modelMat && ('u_model' in info.src)) {
					info.u_model = x.modelMat;
				} else {
					if ('u_model' in info.src) {
						info.u_model = mat4.create();
					}
				}
				if ('a_color' in info.src) { // 查看是否定义了这个attribute，比info.a_color速度更快
					info.a_color!.set(x.color, x);
				}
				if ('a_normal' in info.src) {
					info.a_normal!.set(x.normal, x);
				}
				info.a_pos.set(x.dataFlat, x);
				x.render(gl);
				x.children.forEach(y => this.render(gl, info, { modelMat: x.modelMat || mat4.create(), child: y }));
			});
		} else {
			const x = next.child;
			const nextModelMat = mat4.mul(mat4.create(), next.modelMat, x.modelMat || mat4.create());
			if (x.modelMat) {
				info.u_model = nextModelMat;
			}
			if ('a_color' in info.src) { // 查看是否定义了这个attribute，比info.a_color速度更快
				info.a_color!.set(x.color, x);
			}
			if ('a_normal' in info.src) {
				info.a_normal!.set(x.normal, x);
			}
			info.a_pos.set(x.dataFlat, x);
			x.render(gl);
			x.children.forEach(y => this.render(gl, info, { modelMat: nextModelMat, child: y }));
		}
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