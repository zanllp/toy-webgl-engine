import { DirectionalLight } from '../light/directionLight';
import { CubeTexture } from '../texture';

export type defineEnum =
    'LIGHT' |
    'DIRECTIONAL_LIGHT' |
    'TEX_CUBE' |
    'TEX_2D' |
    'NUM_DIRECTIONAL_LIGHT';

export type variableEnum =
    typeof DirectionalLight.varNameDirectional |
    typeof CubeTexture.varNameSize |
    typeof CubeTexture.varNameUv |
    'u_texture' |
    'a_color' |
    'v_color';

export const _ = (varName: variableEnum | includeName | defineEnum) => varName;


export const dataArrayType = (t: dataType, num: number | defineEnum) => ({ type: t, num });
export type varType = 'attribute' | 'uniform' | 'varying';
export type dataType = 'mat3' | 'mat4' | 'vec3' | 'samplerCube' | 'sampler2d' | { type: dataType, num: number | defineEnum };
export type shaderType = 'all' | 'vertex' | 'fragment';


export type variableType = {
    name: variableEnum;
    varType: varType;
    dataType: dataType;
    target: shaderType
};

const VertexDeclare = 'VertexDeclare';
const FragmentDeclare = 'FragmentDeclare';
const DirectionalLightI = 'DIRECTIONAL_LIGHT';
const LightI = 'LIGHT';

export type includeName =
    typeof VertexDeclare |
    typeof FragmentDeclare |
    typeof DirectionalLightI |
    typeof LightI;

export class ShaderSource {
    public constructor() {
        this.addVariable('all', 'varying', 'vec3', 'v_color');
        this.addVariable('vertex', 'attribute', 'vec3', 'a_color');
    }

    public get variableArray() {
        return Array.from(this.variable);
    }

    public get defineArray() {
        return Array.from(this.define);
    }

    public define = new Map<defineEnum, { def: string, value?: number }>();

    public variable = new Map<variableEnum, variableType>();

    public static includeStore = new Map<includeName, string>();

    public output() {
        this.addRuntimeDeclare();
        const vertex = this.importIncludedScript(vertexSource);
        const fragment = this.importIncludedScript(fragmentSource);
        return {
            vertex,
            fragment
        };
    }

    public importIncludedScript(src: string) {
        const reg = /^\s*#include<\s*(.*)\s*>\s*$/gm;
        let res = reg.exec(src);
        while (res !== null) {
            const includeName = res[1] as includeName;
            let include = ShaderSource.includeStore.get(includeName);
            if (include === undefined) {
                throw new RangeError(`找不到导入代码：${res[0]}`);
            }
            if (/^\s*#include<\s*(.*)\s*>\s*$/gm.test(include)) {
                include = this.importIncludedScript(include);
            }
            src = src.replace(res[0], include);
            res = reg.exec(src);
        }
        return src;
    }

    public addRuntimeDeclare() {
        let vertex = '';
        let fragment = '';
        this.define.forEach(x => {
            vertex += `#define ${x.def} ${x.value || ''}\n`;
            fragment += `#define ${x.def} ${x.value || ''}\n`;
        });
        const variable = this.variableArray.sort((a, b) => a[1].varType.length - b[1].varType.length);
        variable.forEach(([_, x]) => {
            if (typeof x.dataType === 'object') {
                let num = x.dataType.num;
                if (x.target === 'all' || x.target === 'fragment') {
                    fragment += `${x.varType} ${x.dataType.type} ${x.name}[${num}];\n`;
                }
                if (x.target === 'all' || x.target === 'vertex') {
                    vertex += `${x.varType} ${x.dataType.type} ${x.name}[${num}];\n`;
                }
            } else {
                if (x.target === 'all' || x.target === 'fragment') {
                    fragment += `${x.varType} ${x.dataType} ${x.name};\n`;
                }
                if (x.target === 'all' || x.target === 'vertex') {
                    vertex += `${x.varType} ${x.dataType} ${x.name};\n`;
                }
            }
        });
        ShaderSource.includeStore.set('VertexDeclare', vertex);
        ShaderSource.includeStore.set('FragmentDeclare', fragment);
    }

    public addDefine(def: defineEnum, value?: number) {
        this.define.set(def, { def, value });
    }

    public addVariable(target: shaderType, varType: varType, dataType: dataType, name: variableEnum) {
        this.variable.set(name, { name, dataType, varType, target });
    }


    public removeVariable(...name: variableEnum[]) {
        const willDel = new Set<variableType>();
        this.variable.forEach(x => {
            if (name.includes(x.name)) {
                willDel.add(x);
            }
        });
        willDel.forEach(x => this.variable.delete(x.name));
    }

}

const addInclude = (name: includeName, src: string) => ShaderSource.includeStore.set(name, src);

const vertexSource = `
#include<${_('VertexDeclare')}>

uniform mat4 u_proj;
uniform mat4 u_view;
uniform mat4 u_model;
uniform mat4 u_world;
uniform vec3 u_viewWorldPos;
attribute vec3 a_pos;
attribute vec3 a_normal;
varying vec3 v_normal;

void main() {
    vec4 worldPos = u_model * vec4(a_pos,1); 
    gl_Position =   u_proj * u_view * worldPos;
#ifdef TEX_CUBE
    ${_('v_cubeUv')} = a_pos/${_('u_CubeSize')};
#else
    v_color = a_color;
#endif
    v_normal = mat3(u_world) * a_normal;
}`;


const fragmentSource = `
precision mediump float; // 默认精度

#include<${_('FragmentDeclare')}>

varying vec3 v_normal;

#include<${_('LIGHT')}>


void main() {
    vec3 normal = normalize(v_normal);
#ifdef TEX_CUBE
    gl_FragColor = textureCube(${_('u_texture')},  ${_('v_cubeUv')}-.5);
#elif defined(TEX_2D)
#error undefined TEX_2D
#else
    gl_FragColor = vec4(v_color, 1);
#endif
#include<${_('DIRECTIONAL_LIGHT')}>

}
`;

addInclude('DIRECTIONAL_LIGHT', `
#ifdef ${_('DIRECTIONAL_LIGHT')} 
    float allLight = .0;
    for(int i = 0; i < ${_('NUM_DIRECTIONAL_LIGHT')}; i++) {
        float light = lightFactor(normal, ${_('u_lightDirectional')}[i]);
        allLight += light;
    }
    gl_FragColor.rgb *= allLight;
#endif`
);

addInclude('LIGHT', `
#ifdef ${_('LIGHT')}
    float lightFactor(vec3 normal,vec3 light) {
        return max(dot(normal,light),.0);
    }
#endif
`);