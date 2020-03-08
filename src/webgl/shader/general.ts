import { createShaderMaterial } from '../glBase';
import { mat4, vec3 } from 'gl-matrix';
import { ShaderOption } from './shaderOption';
import { ShaderSource } from './shaderSource';
export type baseMaterialType = ReturnType<typeof createMaterial>;
const materialStore = new Map<number, baseMaterialType>();
export const getMaterial = (gl: WebGLRenderingContext, option = new ShaderOption()) => {
    let shader = materialStore.get(option.value);
    if (shader === undefined) {
        const source = new ShaderSource();
        if (option.has(ShaderOption.DIRECTION_LIGHT)) {
            source.addDefine('LIGHT');
            source.addDefine('DIRECTIONAL_LIGHT');
            source.addVariable('fragment', 'uniform', 'vec3', 'u_lightDirectional');
        }
        shader = createMaterial(gl, source);
        materialStore.set(option.value, shader);
    }
    return shader;
};



export const createMaterial = (gl: WebGLRenderingContext, source: ShaderSource) => {
    const src= source.output();
    const vari = source.variableArray;
    const unif = {};
    console.info(src.vertex,src.fragment);
    vari.filter(x => x.type === 'uniform').forEach(x => {
        (unif as any)[x.name] = null; // 混入增加的uniform，以便可以在材质的loc里获取地址
    });
    return createShaderMaterial({
        gl,
        location: {
            attribute: {
                a_pos: 3,
                a_color: 3,
                a_normal: 3
            },
            uniform: {
                u_proj: mat4.create(),
                u_view: mat4.create(),
                u_model: mat4.create(),
                u_world: mat4.create(),
                u_viewWorldPos: vec3.create(),
                ...unif,
            }
        },
        source: src
    });
};


