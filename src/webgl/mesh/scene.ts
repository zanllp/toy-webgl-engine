import { Info, IRenderAble } from '../gl';
import { Model } from './model';
import { mat4 } from 'gl-matrix';
import { modelMat2WorldMat } from './util';

export class Scene<T extends Info> implements IRenderAble {
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
