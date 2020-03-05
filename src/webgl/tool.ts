import { mat3, mat4, vec2, vec3, vec4 } from 'gl-matrix';
import { CSSProperties } from 'react';

export function resize(canvas: any) {
	// 获取浏览器中画布的显示尺寸
	const displayWidth = canvas.clientWidth;
	const displayHeight = canvas.clientHeight;

	// 检尺寸是否相同
	if (canvas.width !== displayWidth ||
		canvas.height !== displayHeight) {

		// 设置为相同的尺寸
		canvas.width = displayWidth;
		canvas.height = displayHeight;
	}
}
export const setCSS = (style: CSSProperties, ...ele: HTMLElement[]) => {
	ele.forEach(el => {
		Object.entries(style).forEach(([k, v]) => {
			(el.style as any)[k] = v;
		});
	});
};

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
		console.error(msg);
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
		console.error(msg);
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
export enum Texture {
	posX = 'TEXTURE_CUBE_MAP_POSITIVE_X',
	negX = 'TEXTURE_CUBE_MAP_NEGATIVE_X',
	posY = 'TEXTURE_CUBE_MAP_POSITIVE_Y',
	negY = 'TEXTURE_CUBE_MAP_NEGATIVE_Y',
	posZ = 'TEXTURE_CUBE_MAP_POSITIVE_Z',
	negZ = 'TEXTURE_CUBE_MAP_NEGATIVE_Z',
	T2D = 'TEXTURE_2D',
}
export const TexData = {
	null(gl: WebGLRenderingContext, width: number, height: number, target: Texture, data?: ArrayLike<number>) {
		return TexData.write(gl, width, height, target, data, null);
	},
	/**
	 * 从新的数据创建buffer
	 */
	writeImage(gl: WebGLRenderingContext, image: HTMLImageElement, target: Texture, tex?: WebGLTexture | null) {
		const texture = (tex === null || tex === undefined) ? gl.createTexture() : tex;
		const t = target === Texture.T2D ? gl.TEXTURE_2D : gl.TEXTURE_CUBE_MAP;
		gl.bindTexture(t, texture);
		gl.texImage2D(gl[target], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
		gl.generateMipmap(t);
		return texture;
	},

	write(gl: WebGLRenderingContext, width: number, height: number, target: Texture, data?: ArrayLike<number> | null, tex?: WebGLTexture | null, ) {
		const texture = (tex === null || tex === undefined) ? gl.createTexture() : tex;
		const t = target === Texture.T2D ? gl.TEXTURE_2D : gl.TEXTURE_CUBE_MAP;
		gl.bindTexture(t, texture);
		gl.texImage2D(gl[target], 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data ? new Uint8Array(data) : null);
		gl.generateMipmap(t);
		return texture;
	},
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
	const switchProgram = () => {
		if (gl.getParameter(gl.CURRENT_PROGRAM) !== program) {
			gl.useProgram(program);
		}
	};
	switchProgram();
	const loc = {} as { [p in keyof A]: number } & { [p in keyof U]: WebGLUniformLocation | null };
	const res = {} as { program: WebGLProgram; loc: typeof loc; src: A & U } & unifType<U> & attrType<A>; // 如果定义在一个即将展开的对象上,setget生效
	Object.keys(attribute).forEach(x => {
		(loc as any)[x] = gl.getAttribLocation(program, x);
		const size = attribute[x];
		const idRec = new Map<any, { data: Array<number>; buf: WebGLBuffer | null }>();
		(res as any)[x] = {
			get(id: any) {
				const res = idRec.get(id);
				if (res) {
					return res.data;
				}
			},
			set(data: any, id?: any) {
				switchProgram();
				if (id === undefined) {
					BufferData.write(gl, data, size, loc[x]);
				} else {
					const rec = idRec.get(id);
					if (rec !== undefined && rec.data === data) { // 可以重用数据
						BufferData.reuse(gl, rec.buf, size, loc[x]);
					} else {
						const buf = BufferData.write(gl, data, size, loc[x]);
						idRec.set(id, { data, buf });
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
				switchProgram();
				eset(_);
			},
			get() {
				switchProgram();
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

/**
 * 创建程序信息
 * @param param0 
 */
export const createProgramInfo = <A extends constraintNull, U extends constraintAll>({ gl, location, source }: programInfoParamsT<A, U>) => {
	const program = createProgram(gl, source.vertex, source.fragment);
	return programInfoFromKey({ gl, program, attribute: location.attribute, uniform: location.uniform });
};

export type setStateType<V> = (Partial<V> | ((s: V) => Partial<V>) | { action: 'incr' | 'decr', key: keyof V, value: number });
/**
 * 创建设置状态函数
 * @param gl 
 * @param programInfo 程序信息，渲染器的参数 render(gl, programInfo, s.state) 
 * @param render 渲染函数 
 * @param s 包含state键的对象，用来作为状态的唯一源，和渲染器的参数
 */
export const createSetStateFn = <T, V, U extends { state: V }>(gl: WebGLRenderingContext, programInfo: T, render: (gl: WebGLRenderingContext, info: T, v?: V) => any, s: U) => {
	//const throttleRender = throttle((s: U) => render(gl, programInfo, s.state), 12);
	return (set: setStateType<V>) => {
		let { state } = s;
		if (typeof set === 'object') {
			if ('action' in set) {
				const v = state as any;
				if (typeof v[set.key] !== 'number') {
					throw new Error(`key:${set.key} 不能作用于value:${v},type:${typeof v[set.key]}`);
				}
				switch (set.action) {
					case 'incr':
						v[set.key] += set.value;
						break;
					case 'decr':
						v[set.key] -= set.value;
						break;
				}
			} else {
				state = { ...state, ...set };
			}
		} else {
			state = { ...state, ...set(state) };
		}
		s.state = state;
		//throttleRender(state);
		//render(gl, programInfo, state.value)
		return state;
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
	return calcNormalN(posData).flat(2);
};
/**
 * 计算表面法线
 */
export const calcNormalN = (posData: PosDataType) => {
	return posData.map((x) => {
		const e = [[x[0], x[1], x[2]], [x[3], x[4], x[5]], [x[6], x[7], x[8]]];
		const v1 = vec3.sub(vec3.create(), e[1], e[0]);
		const v2 = vec3.sub(vec3.create(), e[2], e[0]);
		const normal = vec3.cross(vec3.create(), v1, v2);
		vec3.normalize(normal, normal);
		const res = Array.from(normal);
		return [res, res, res, res, res, res]; // 一个面2个三角形6个点
	});
};

type Info = {
	a_pos: attrResType;
	a_normal?: attrResType;
	a_color?: attrResType;
	u_model?: mat4;
	u_world?: mat4;
	u_proj: mat4;
	u_view: mat4;
	src: any,
	program: WebGLProgram;
};
export type SetMatType = ((mat: mat4) => mat4 | void) | mat4;
const createSetMatFn = <T>(target: keyof T) => {
	return function (this: T, fn: SetMatType) {
		const t = this as any;
		if (typeof fn === 'function') { // 如果是函数
			const mat = mat4.create();
			const res = fn(mat);
			if (res) { // 如果函数有返回值
				t[target] = res;
			} else {
				t[target] = mat;
			}
		} else { // 如果是矩阵类型
			t[target] = fn;
		}
		return t[target] as mat4;
	};
};
export class Model {
	constructor(data: PosDataType, normal?: number[]) {
		this.data = data;
		this.setModelMat = createSetMatFn<Model>('modelMat');
		if (Model.memoPosfNormal.has(this.data)) {
			const d = Model.memoPosfNormal.get(this.data);
			this.position = d!.d;
			this.normal = d!.n;
		} else {
			this.position = data.flat();
			if (normal) {
				this.normal = normal;
			} else {
				this.normal = calcNormal(this.data);
			}
			Model.memoPosfNormal.set(this.data, { d: this.position, n: this.normal });
		}
	}
	public type = 'Model';
	public readonly data: PosDataType;
	public readonly position: Array<number>;
	public readonly normal: Array<number>;
	public readonly children = new Set<Model>();
	public readonly matrixStack = new Array<mat4>();
	public parent?: Model;
	public modelMat = mat4.create();
	public color = new Array<number>();
	static memoPosfNormal = new Map<PosDataType, { d: Array<number>, n: Array<number> }>();
	get childArray() {
		return Array.from(this.children);
	}
	public addChild(...model: Model[]) {
		model.forEach(x => {
			x.parent = this;
			this.children.add(x);
		});
	}
	public fillRandColor(factor = 1) {
		this.color = randColor(this.data, factor);
	}
	public render(gl: WebGLRenderingContext) {
		gl.drawArrays(gl.TRIANGLES, 0, this.position.length / 3);
	}
	public setModelMat(fn: SetMatType): mat4 {
		throw new Error('Method not implemented.');
	}
	/**
	 * 压入一个矩阵,右乘当前模型矩阵
	 * @param mat 当为mat4类型直接右乘。当为函数会提供一个单位矩阵以供修改
	 */
	public pushMat(mat?: SetMatType) {
		if (mat === undefined) { // 压入一个占位置的单位矩阵
			this.matrixStack.push(mat4.create());
			return;
		}
		let _mat: mat4 = mat4.create();
		if (typeof mat === 'function') {
			const res = mat(_mat);
			if (res) {
				_mat = res;
			}
		} else {
			_mat = mat;
		}
		this.matrixStack.push(_mat);
		mat4.mul(this.modelMat, this.modelMat, _mat);
	}
	/**
	 * 弹出栈，模型矩阵返回上次压入前的状态
	 */
	public popMat() {
		const mat = this.matrixStack.pop();
		if (mat) {
			mat4.invert(mat, mat);
			mat4.mul(this.modelMat, this.modelMat, mat);
		}
	}

	public get finalModelmat(): mat4 {
		if (this.parent) {
			const mat = mat4.create();
			return mat4.mul(mat, this.parent.finalModelmat, this.modelMat);
		} else {
			return this.modelMat;
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
export type colorType = number[] | number;
export type cubeColorType = { front: colorType; back: colorType; right: colorType; left: colorType; top: colorType; bottom: colorType; } | number;
export class Box extends Model {
	public constructor({ x = 100, y = 100, z = 100, color = 'none' }: {
		x?: number; y?: number; z?: number; color?: 'none' | 'rand' | cubeColorType
	} = {}) {
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
			Box.memoPos.set(str, data);
		}

		if (color === 'rand') {
			this.fillRandColor();
		}
		if (typeof color === 'object' || typeof color === 'number') {
			this.fillColor(color);
		}
		this.type = 'Box';
	}
	static memoPos = new Map<string, PosDataType>();
	public fillColor(color: cubeColorType | number) {
		if (typeof color === 'object') {
			const { front, back, right, left, top, bottom } = color;
			this.color = [front, back, right, left, top, bottom].map(color => {
				let c: Array<number>;
				if (color instanceof Array) {
					c = color;
				} else {
					c = num2color(color);
				}
				c = c.map(c => c / 255);
				return [c, c, c, c, c, c];
			}).flat(2);
		} else {
			const vec3C = num2color(color);
			this.fillColor({
				front: vec3C,
				back: vec3C,
				right: vec3C,
				left: vec3C,
				top: vec3C,
				bottom: vec3C
			});
		}

	}
}

type latLong = {
	start: number;
	end: number;
	sub: number;
};
export class Sphere extends Model {
	/**
	 * 球体，面数 = 2 x latitude.sub x longitube.sub，默认2 x 30 x 30面
	 * @param radius 半径
	 * @param latitude 维度相关
	 * @param longitude 经度相关
	 */
	public constructor({ radius = 100, latitude, longitude, color = 'none' }:
		{ radius?: number; latitude?: Partial<latLong>; longitude?: Partial<latLong>; color?: 'none' | 'rand' | colorType } = {}) {
		const str = JSON.stringify({ radius, latitude, longitude });
		if (Sphere.memoPos.has(str)) {
			super(Sphere.memoPos.get(str)!.data);
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
			for (let i = 0; i < p.length - 1; i++) { // 层
				for (let ii = 0; ii < p[i].length - 1; ii++) { // 列
					data.push(r2t([
						...p[i][ii + 1],
						...p[i][ii],
						...p[i + 1][ii],
						...p[i + 1][ii + 1],
					]));
				}
			}
			// 下面操作是平滑面法线
			const n = calcNormalN(data);
			const vec3Avg = (p: Array<number>, c: Array<number>) => {
				p[0] += c[0] / 4;
				p[1] += c[1] / 4;
				p[2] += c[2] / 4;
				return p;
			};
			for (let i = 0; i < lat.sub - 1; i += 1) {
				for (let ii = 0; ii < long.sub; ii += 1) {
					if (ii === long.sub - 1) { // 经度越界的地方变成0
						const lt6 = n[lat.sub * i + ii][5]; // 左上角方块的第六个位置
						const rt5 = n[lat.sub * i][4];
						const lb1 = n[lat.sub * (i + 1) + ii][0];
						const rb2 = n[lat.sub * (i + 1)][1];
						const avg = [lt6, rt5, lb1, rb2].reduce(vec3Avg, [0, 0, 0]);
						n[lat.sub * i + ii][5] = avg;
						n[lat.sub * i][2] = avg;
						n[lat.sub * i][4] = avg;
						n[lat.sub * (i + 1) + ii][0] = avg;
						n[lat.sub * (i + 1) + ii][3] = avg;
						n[lat.sub * (i + 1)][1] = avg;
					} else {
						const lt6 = n[lat.sub * i + ii][5]; // 左上角方块的第六个位置
						const rt5 = n[lat.sub * i + ii + 1][4];
						const lb1 = n[lat.sub * (i + 1) + ii][0];
						const rb2 = n[lat.sub * (i + 1) + ii + 1][1];
						const avg = [lt6, rt5, lb1, rb2].reduce(vec3Avg, [0, 0, 0]);
						n[lat.sub * i + ii][5] = avg;
						n[lat.sub * i + ii + 1][2] = avg;
						n[lat.sub * i + ii + 1][4] = avg;
						n[lat.sub * (i + 1) + ii][0] = avg;
						n[lat.sub * (i + 1) + ii][3] = avg;
						n[lat.sub * (i + 1) + ii + 1][1] = avg;
					}
				}
			}
			const tAvg = [0, 1, 0]; // 北极点法线
			const bAvg = [0, -1, 0]; // 南极点法线
			for (let i = 0; i < long.sub; i++) {
				n[i][0] = tAvg;
				n[i][1] = tAvg;
				n[i][3] = tAvg;
				n[(lat.sub - 1) * long.sub + i][2] = bAvg;
				n[(lat.sub - 1) * long.sub + i][4] = bAvg;
				n[(lat.sub - 1) * long.sub + i][5] = bAvg;
			}
			const normal = n.flat(2);
			super(data, normal);
			Sphere.memoPos.set(str, { data, normal });
		}
		if (color === 'rand') {
			this.fillRandColor();
		} else if ((color instanceof Array) || (typeof color === 'number')) {
			this.fillColor(color);
		}
		this.type = 'Sphere';
	}
	static memoPos = new Map<string, { data: PosDataType, normal: Array<number> }>();
	/**
	 * 填充颜色
	 * @param color vec4或者vec3 (0 -> 255),0x1890ff
	 */
	public fillColor(color: colorType) {
		// 一个面2个三角形
		let c: Array<number>;
		if (color instanceof Array) {
			c = color;
		} else {
			c = num2color(color);
		}
		c = c.map(c => c / 255);
		for (let i = 0; i < this.data.length * 2 * 3; i++) {
			this.color.push(...c);
		}
	}
}



export class Point extends Model {
	public constructor(vec3: Array<number>) {
		super([vec3]);
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
		super([]);
		for (const i of models) {
			this.color = [...this.color, ...i.color];
			if (!mat4.equals(i.modelMat, mat4.create())) {
				for (let ii = 0; ii < i.normal.length; ii += 3) {
					const _pos = i.position;
					const pos = vec3.fromValues(_pos[ii], _pos[ii + 1], _pos[ii + 2]);
					this.position.push(...Array.from(vec3.transformMat4(vec3.create(), pos, i.modelMat)));
					const _nor = i.normal;
					const normal = vec3.fromValues(_nor[ii], _nor[ii + 1], _nor[ii + 2]);
					this.normal.push(...Array.from(vec3.transformMat4(vec3.create(), normal, i.modelMat)));
				}
			} else {
				this.position.push(...i.position);
				this.normal.push(...i.normal);
			}
		}
	}
	public readonly position = new Array<number>();
	public readonly normal = new Array<number>();
	public readonly color = new Array<number>();
}

export class Scene<T extends Info> {
	public constructor(gl: WebGLRenderingContext, info: T, ...models: Array<Model>) {
		this.models.push(...models);
		this.gl = gl;
		this.info = info;
	}
	public gl: WebGLRenderingContext;
	public info: T;
	public projectionMat = mat4.create();
	public viewMat = mat4.create();
	public models = new Array<Model>();
	public render(next?: { modelMat: mat4, child: Model }) {
		const { info, gl } = this;
		if (next === undefined) {
			info.u_proj = this.projectionMat;
			info.u_view = this.viewMat;
			this.models.forEach(x => {
				if ('u_model' in info.src) {
					info.u_model = x.modelMat;
				}
				if ('u_world' in info.src) {
					info.u_world = modelMat2WorldMat(x.modelMat);
				}
				if ('a_color' in info.src) { // 查看是否定义了这个attribute，比info.a_color速度更快
					info.a_color!.set(x.color, x);
				}
				if ('a_normal' in info.src) {
					info.a_normal!.set(x.normal, x);
				}
				info.a_pos.set(x.position, x);
				x.render(gl);
				x.children.forEach(y => this.render({
					modelMat: x.modelMat,
					child: y
				}));
			});
		} else {
			const x = next.child;
			const nextModelMat = mat4.mul(mat4.create(), next.modelMat, x.modelMat);
			info.u_model = nextModelMat;
			info.u_world = modelMat2WorldMat(nextModelMat);
			if ('a_color' in info.src) { // 查看是否定义了这个attribute，比info.a_color速度更快
				info.a_color!.set(x.color, x);
			}
			if ('a_normal' in info.src) {
				info.a_normal!.set(x.normal, x);
			}
			info.a_pos.set(x.position, x);
			x.render(gl);
			x.children.forEach(y => this.render({
				modelMat: nextModelMat,
				child: y
			}));
		}
	}
	public addModel(...model: Model[]) {
		this.models.push(...model);
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
			return func(...args);
		}
	};
};


export type actionsType<V> = ((tDiff: number) => setStateType<V>) | { action: (tDiff: number) => setStateType<V>, once?: boolean };
export const createKeyListenerTask = <V>(actions: { [x: string]: actionsType<V> }) => {
	const keyPressing = new Set<string>();
	document.addEventListener('keydown', x => keyPressing.add(x.code));
	document.addEventListener('keyup', x => keyPressing.delete(x.code));
	return (t: number) => {
		keyPressing.forEach((k) => {
			const p = actions[k as any];
			if (p) {
				if (typeof p === 'function') {
					p(t);
				} else {
					const { once, action } = p;
					action(t);
					if (once) { // 只执行一次
						keyPressing.delete(k);
					}
				}
			}
		});
	};
};
export type projParamsType = { fovy: number, aspect: number, near: number, far: number } |
	((gl: WebGLRenderingContext) => ({ fovy: number, aspect: number, near: number, far: number }));
export class GL<T extends { [x: string]: Info } = any, S = any> implements IRenderAble {
	constructor(gl: WebGLRenderingContext, info: T, state: S) {
		this.gl = gl;
		this.info = info;
		this.state = state;
		this.setState = createSetStateFn(gl, info, this.renderFrame.bind(this), this);
		this.setProjectionMat = createSetMatFn<GL>('projectionMat');
		this.setViewMat = createSetMatFn<GL>('viewMat');
		this.loop.renderTask = this.renderFrame.bind(this);
		this.resize();
	}
	public gl: WebGLRenderingContext;
	public state: Readonly<S>;
	public loop = new RenderLoop();
	public info: T;
	public projectionMat = mat4.create();
	public viewMat = mat4.create();
	public projParams?: projParamsType;
	public renderQuene = new Array<IRenderAble>();
	public render(): IRenderAble[] | void {
		throw new Error('Method not implemented.');
	}
	public setState(s: setStateType<S>): S {
		throw new Error('Method not implemented.');
	}
	public clear() {
		const { gl } = this;
		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	}
	public renderFrame() {
		this.clear();
		this.render();
		this.renderQuene.forEach(x => {
			x.viewMat = this.viewMat;
			x.projectionMat = this.projectionMat;
			x.render();
		});
	}
	public resize() {
		const { gl } = this;
		resize(gl.canvas);
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		// 如果已设置投影矩阵，且其参数类型为函数，则重新获取设置一次
		if (this.projParams && typeof this.projParams === 'function') {
			this.setProjection(this.projParams);
		}
		if (this.loop.state === 'run') {
			this.renderFrame();
		}
	}

	public setProjection(p: projParamsType) {
		this.projParams = p;
		if (typeof p === 'function') {
			const _p = p(this.gl);
			this.setProjectionMat(x => mat4.perspective(x, _p.fovy, _p.aspect, _p.near, _p.far));
		} else {
			const _p = p;
			this.setProjectionMat(x => mat4.perspective(x, _p.fovy, _p.aspect, _p.near, _p.far));
		}
	}

	public setViewMat(fn: SetMatType): mat4 {
		throw new Error('Method not implemented.');
	}

	public setProjectionMat(fn: SetMatType): mat4 {
		throw new Error('Method not implemented.');
	}
}

export class RenderLoop {
	public rqaId?: number;
	public fps: number = 0;
	public averageFps: number = -1;
	public state: 'run' | 'stop' = 'stop';
	public lastRecTime = 0;
	public count: number = 0;
	public renderTask?: (t: number) => any;
	public task = new Array<(t: number) => any>();
	public onceTask = new Array<(t: number) => any>();
	public run(...tasks: Array<(t: number) => any>) {
		this.state = 'run';
		this.addTask(...tasks);
		let lastT = Date.now();
		const loop = (t: number) => {
			this.rqaId = requestAnimationFrame(loop);
			const dt = t - lastT;
			this.task.forEach(x => x(dt));
			this.onceTask.forEach(x => x(dt));
			this.renderTask?.call(null, dt);
			lastT = t;
			if (this.onceTask.length !== 0) {
				this.onceTask = [];
			}
			this.calcFps(t);
		};
		this.rqaId = requestAnimationFrame(loop);
	}
	public stop() {
		this.state = 'stop';
		if (this.rqaId !== undefined) {
			cancelAnimationFrame(this.rqaId);
		}
	}
	public addTask(...tasks: Array<(t: number) => any>) {
		tasks.forEach(x => {
			if (this.task.indexOf(x) === -1) {
				this.task.push(x);
			}
		});
	}
	public addOnceTask(...tasks: Array<(t: number) => any>) {
		tasks.forEach(x => {
			if (this.onceTask.indexOf(x) === -1) {
				this.onceTask.push(x);
			}
		});
	}
	public calcFps(t: number) {
		this.count++;
		const recInterval = 10;
		if (this.count % recInterval === 0) {
			const dt = (t - this.lastRecTime) / recInterval;
			const fps = 1000 / dt;
			if (this.averageFps === -1) {
				this.averageFps = fps;
			} else {
				this.averageFps = (this.averageFps * (this.count - recInterval) + fps * recInterval) / this.count;
			}
			this.fps = fps;
			this.lastRecTime = t;
		}
	}
}

/**
 * 
 * @param c 
 */
export const num2color = (c: number) => {
	const r = c >> 16;
	const g = (c >> 8) & 0xff;
	const b = c & 0xff;
	return [r, g, b];
};

export const getClassName = (t: any) => {
	return t.__proto__.constructor.name as string;
};
export const modelMat2WorldMat = (modelMat: mat4) => {
	const worldMat = mat4.clone(modelMat);
	worldMat[12] = 0;
	worldMat[13] = 0;
	worldMat[14] = 0;
	return worldMat;
};

const createPre = (gl: WebGLRenderingContext) => createProgramInfo({
	gl,
	location: {
		attribute: {
			a_pos: 2,
		},
		uniform: {
			u_viewDirectionProjectionInverse: mat4.create(),
			u_skybox: null,
		}
	},
	source: {
		vertex: `
		attribute vec4 a_pos;
		varying vec4 v_pos;
		void main() {
		  v_pos = a_pos;
		  gl_Position = a_pos;
		  gl_Position.z = 1.0;
		}
			`,
		fragment: `	
		precision mediump float;
		
		uniform samplerCube u_skybox;
		uniform mat4 u_viewDirectionProjectionInverse;
		
		varying vec4 v_pos;
		void main() {
		  vec4 t = u_viewDirectionProjectionInverse * v_pos;
		  gl_FragColor = textureCube(u_skybox, normalize(t.xyz / t.w));
		}
		`
	}
});

export class SkyBox implements IRenderAble {
	public constructor(gl: WebGLRenderingContext,
		texAll: { posX: string; posY: string; posZ: string; negX: string; negY: string; negZ: string; },
		onLoad?: () => void) {
		this.gl = gl;
		this.info = createPre(gl);
		if (onLoad) {
			this.onLoad = onLoad;
		}
		this.loadTex(texAll);
	}

	projectionMat: mat4 = mat4.create();
	viewMat: mat4 = mat4.create();
	public data = [
		-1, -1,
		1, -1,
		-1, 1,
		-1, 1,
		1, -1,
		1, 1,
	];
	public gl: WebGLRenderingContext;
	public buf?: WebGLBuffer | null;
	public info: ReturnType<typeof createPre>;
	public render() {
		const { gl, info } = this;
		info.a_pos.set(this.data, this);
		const mat = mat4.create();
		mat4.mul(mat, this.projectionMat, modelMat2WorldMat(this.viewMat));
		mat4.invert(mat, mat);
		info.u_viewDirectionProjectionInverse = mat;
		gl.uniform1i(info.loc.u_skybox, 0);

		// let our quad pass the depth test at 1.0
		gl.depthFunc(gl.LEQUAL);
		// Draw the geometry.
		gl.drawArrays(gl.TRIANGLES, 0, 1 * 6);
	}
	private onLoad() { }
	private loadTex(texAll: { posX: string; posY: string; posZ: string; negX: string; negY: string; negZ: string; }) {
		const { gl } = this;
		const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
		const allPromise = Object.entries(texAll)
			.map(([k, v]) => ({ url: v, target: (Texture as any)[k] as Texture }))
			.map((faceInfo) => {
				const { target, url } = faceInfo;
				TexData.write(gl, 512, 512, target, null, texture);
				const image = new Image();
				image.src = url;
				return new Promise(x => {
					image.addEventListener('load', () => {
						x();
					});
				}).then(() => {
					TexData.writeImage(gl, image, target, texture);
				});
			});
		gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		Promise.all(allPromise).then(this.onLoad.bind(this));
	}

}

export interface IRenderAble {
	projectionMat: mat4 | undefined;
	viewMat: mat4 | undefined;
	gl: WebGLRenderingContext;
	render(): void;
}


const createMeshLineInfo = (gl: WebGLRenderingContext) => createProgramInfo({
	gl,
	location: {
		attribute: {
			a_pos: 3
		},
		uniform: {
			u_proj: mat4.create(),
			u_view: mat4.create(),
		}
	},
	source: {
		vertex: `
		uniform mat4 u_proj;
		uniform mat4 u_view;
		attribute vec3 a_pos;
		void main() {
			vec4 pos = vec4(a_pos,1);
			gl_Position =  u_proj * u_view * pos;
			gl_PointSize = 8.;
		}`,
		fragment: `
		precision mediump float; 
		void main() {
			gl_FragColor = vec4(1.,1.,1.,1);
		}
		`
	}
});
export class MeshLine implements IRenderAble {
	public constructor({ range = 1500, num = 10, is3d = true, gl }:
		{ range?: number; num?: number; is3d?: boolean; gl: WebGLRenderingContext }) {
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
		this.size = is3d ? 3 : 2;
		this.gl = gl;
		this.info = createMeshLineInfo(gl);
		this.position = dst.flat(1);
	}
	public size: number;
	projectionMat: mat4 = mat4.create();
	viewMat: mat4 = mat4.create();
	gl: WebGLRenderingContext;
	info: ReturnType<typeof createMeshLineInfo>;
	position: Array<number>;
	public render() {
		const { gl, info } = this;
		info.u_proj = this.projectionMat;
		info.u_view = this.viewMat;
		info.a_pos.set(this.position, this);
		gl.drawArrays(gl.LINES, 0, this.position.length / this.size);
	}
}

export const trimNumber = (d: any, fract = 2) => {
	const next = { ...d };
	Object.keys(next).forEach(x => {
		const n = next[x];
		if (typeof n === 'number') {
			next[x] = Number((n as number).toFixed(fract));
		} else if (typeof n === 'object') {
			next[x] = trimNumber(n);
		}
	});
	return next;
};