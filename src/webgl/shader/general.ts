import { mat4, vec3 } from 'gl-matrix';
import { createShaderMaterial } from '../glBase';
import { ShaderOption } from './shaderOption';
import { ShaderSource, dataArrayType, variableEnum } from './shaderSource';

export type baseMaterialType = ReturnType<typeof createMaterial>;

const materialStore = new Map<ShaderOption, baseMaterialType>();

export const getMaterial = (gl: WebGLRenderingContext, option = new ShaderOption()) => {
    let shader = Array.from(materialStore).find(x => x[0].equal(option))?.[1];
    if (shader === undefined) {
        const source = new ShaderSource();
        if (option.has(ShaderOption.CUBE)) {
            source.addDefine('CUBE');
            if (option.has(ShaderOption.SMAPLER_2D)) {
                source.addDefine('TEX_2D');
                source.addVariable('all', 'varying', 'float', 'v_texIndex');
                source.addVariable('vertex', 'attribute', 'float', 'a_texIndex');
                source.addVariable('fragment', 'uniform', 'sampler2d', 'u_texture2D');
            }
        }
        if (option.has(ShaderOption.DIRECTION_LIGHT)) {
            source.addDefine('LIGHT');
            source.addDefine('DIRECTIONAL_LIGHT');
            source.addVariable('fragment', 'uniform', dataArrayType('vec3', 'NUM_DIRECTIONAL_LIGHT'), 'u_lightDirectional');
            source.addDefine('NUM_DIRECTIONAL_LIGHT', option.define.get('NUM_DIRECTIONAL_LIGHT'));
        }
        if (option.has(ShaderOption.SMAPLER_CUBE)) {
            source.removeVariable('v_color', 'a_color'); // 默认添加颜色,有立方体纹理时不需要这些
            source.addDefine('TEX_CUBE');
            source.addVariable('fragment', 'uniform', 'samplerCube', 'u_texture');
            source.addVariable('all', 'varying', 'vec3', 'v_cubeUv');
            source.addVariable('vertex', 'uniform', 'vec3', 'u_CubeSize');
        }
        shader = createMaterial(gl, source);
        materialStore.set(option, shader);
    }
    return shader;
};

/**
 * 定义运行时增加attribute变量的每次读取数量
 */
const attrReadCount: Partial<{ [p in variableEnum]: number }> = {
    a_color: 3,
    a_texIndex: 1
};

export const createMaterial = (gl: WebGLRenderingContext, source: ShaderSource) => {
    const src = source.output();
    const vari = source.variableArray;
    const unif = {};
    const attr = {};
    console.info(src.vertex, src.fragment);
    vari.filter((x) => x[1].varType === 'uniform').forEach(x => {
        (unif as any)[x[0]] = null; // 混入增加的uniform，以便可以在材质的loc里获取地址
    });
    vari.filter(x => x[1].varType === 'attribute').forEach(x => {
        (attr as any)[x[0]] = attrReadCount[x[0]];
    });
    return createShaderMaterial({
        gl,
        location: {
            attribute: {
                a_pos: 3,
                a_color: 3,
                a_normal: 3,
                ...attr
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


