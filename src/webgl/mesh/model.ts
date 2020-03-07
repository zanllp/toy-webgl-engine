import { PosDataType, createSetMatFn, calcNormal, randColor, SetMatType } from './util';
import { mat4, vec3 } from 'gl-matrix';

export class Model {

	get childArray() {
		return Array.from(this.children);
	}

    /**
     * 获取最终模型转换矩阵 = ...爷爷级矩阵 x 父级矩阵 x 自己的矩阵
     */
	public get finalModelmat(): mat4 {
		if (this.parent) {
			const mat = mat4.create();
			return mat4.mul(mat, this.parent.finalModelmat, this.modelMat);
		} else {
			return this.modelMat;
		}
	}

	/**
	 * 获取模型位置
	 */
	public get modelPos() {
		return mat4.getTranslation(vec3.create(), this.finalModelmat);
	}

	constructor(data: PosDataType, size?: number[], normal?: number[]) {
		this.data = data;
		this.size = size;
		this.setModelMat = createSetMatFn<Model>('modelMat');
		const vertex = Model.memoPosfNormal.get(this.data);
		// 若派生类有提供法线数据一律用派生类的
		if (vertex) {
			this.position = vertex.position;
			if (normal) {
				this.normal = normal;
			} else {
				this.normal = vertex.normal;
			}
		} else {
			this.position = data.flat();
			if (normal) {
				this.normal = normal;
			} else {
				this.normal = calcNormal(this.data);
			}
			Model.memoPosfNormal.set(this.data, { position: this.position, normal: this.normal });
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
	public readonly size?: number[];
	static memoPosfNormal = new Map<PosDataType, { position: Array<number>, normal: Array<number> }>();

    /**
     * 添加子级模型
     * @param model
     */
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
	 * 弹出栈，模型矩阵回到上次压入前的状态
	 */
	public popMat() {
		const mat = this.matrixStack.pop();
		if (mat) {
			mat4.invert(mat, mat);
			mat4.mul(this.modelMat, this.modelMat, mat);
		}
	}
}