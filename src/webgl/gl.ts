import { mat4 } from 'gl-matrix';
import { attrResType, resize } from './glBase';
import { createSetMatFn, createSetStateFn, SetMatType, setStateType } from './mesh/util';
import { RenderLoop } from './renderloop';

export type Info = {
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

	/**
	 * webgl上下文
	 */
	public gl: WebGLRenderingContext;

	/**
	 * 状态
	 */
	public state: Readonly<S>;

	/**
	 * 主循环
	 */
	public loop = new RenderLoop();

	/**
	 * 提供的所有程序信息
	 */
	public info: T;

	/**
	 * 投影矩阵
	 */
	public projectionMat = mat4.create();

	/**
	 * 视图矩阵
	 */
	public viewMat = mat4.create();

	/**
	 * 待渲染目标的队列
	 */
	public renderQuene = new Array<IRenderAble>();

	/**
	 * 投影参数
	 */
	private projParams?: projParamsType;

	/**
	 * 渲染函数，在渲染渲染队列前调用，执行矩阵的变换
	 */
	public render(): IRenderAble[] | void {
		throw new Error('Method not implemented.');
	}

	/**
	 * 设置状态，和react的类似，
	 * @param {setStateType} s
 	 */
	public setState(s: setStateType<S>): S {
		throw new Error('Method not implemented.');
	}

	/**
	 * 清空画布，一般不需要调用
	 */
	public clear() {
		const { gl } = this;
		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	}

	/**
	 * 渲染一帧
	 */
	public renderFrame() {
		this.clear();
		this.render();
		this.renderQuene.forEach(x => {
			x.viewMat = this.viewMat;
			x.projectionMat = this.projectionMat;
			x.render();
		});
	}

	/**
	 * 重设尺寸
	 */
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

	/**
	 * 设置投影参数
	 * @param p 
	 */
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

	/**
	 * 设置视图矩阵
	 * @param fn 
	 */
	public setViewMat(fn: SetMatType): mat4 {
		throw new Error('Method not implemented.');
	}

	/**
	 * 设置投影矩阵
	 * @param fn 
	 */
	public setProjectionMat(fn: SetMatType): mat4 {
		throw new Error('Method not implemented.');
	}
}



/**
 * 可被GL类渲染的接口，将实现后的类实例添加到GL类的渲染队列就能渲染
 */
export interface IRenderAble {
	projectionMat: mat4 | undefined;
	viewMat: mat4 | undefined;
	gl: WebGLRenderingContext;
	render(): void;
}



