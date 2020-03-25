import { DirectionalLight } from '../light/directionLight';
import { CubeTexture } from '../texture';

export type defineEnum =
    'CUBE' |
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
    'v_color' |
    'v_texIndex' |
    'a_texIndex' |
    'u_texture2D';

export const _ = (varName: variableEnum | includeName | defineEnum) => varName;


export const dataArrayType = (t: dataType, num: number | defineEnum) => ({ type: t, num });
export type varType = 'attribute' | 'uniform' | 'varying';
export type dataType = 'float' | 'vec3' | 'vec4' | 'mat3' | 'mat4' | 'samplerCube' | 'sampler2d' | { type: dataType, num: number | defineEnum };
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
const CubeColorTexMixI = 'CUBE_COLOR_TEX_MIX';

export type includeName =
    typeof VertexDeclare |
    typeof FragmentDeclare |
    typeof DirectionalLightI |
    typeof LightI |
    typeof CubeColorTexMixI;
type fnt = ReturnType<typeof createIncludeFn>;
export type includeValueType = ((fnt: fnt) => string) | string;

export class ShaderSource {

    public get variableArray() {
        return Array.from(this.variable);
    }

    public get defineArray() {
        return Array.from(this.define);
    }
    public constructor() {
        this.addVariable('all', 'varying', 'vec4', 'v_color');
        this.addVariable('vertex', 'attribute', 'vec4', 'a_color');
    }

    public define = new Map<defineEnum, { def: string, value?: number }>();

    public variable = new Map<variableEnum, variableType>();

    public static includeStore = new Map<includeName, includeValueType>();


    public output() {
        this.addRuntimeDeclare();
        const vertex = vertexSource(this);
        const fragment = fragmentSource(this);
        return {
            vertex,
            fragment
        };
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

    private addRuntimeDeclare() {
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

}

const addInclude = (name: includeName, src: includeValueType) => {
    ShaderSource.includeStore.set(name, src);
};
const createIncludeFn = (shader: ShaderSource, state = true) => {
    const defined = (...name: defineEnum[]) => {
        for (const iterator of name) {
            if (!shader.define.has(iterator)) {
                return false;
            }
        }
        return true;
    };
    const includeStack = new Array<string>();
    const include = (name: includeName) => {
        if (!state) {
            return '';
        }
        if (includeStack.length > 8) {
            let msg = '包含过深，检查是否存在相互包含\n';
            [...includeStack].reverse().forEach(x => msg += `   在 ${x}\n`);
            throw new Error(msg);
        }
        let res = ShaderSource.includeStore.get(name);
        if (res === undefined) {
            throw new RangeError(`找不到导入文件:${name}`);
        }
        if (typeof res === 'function') { // 惰性求值
            includeStack.push(name);
            res = res(fn);
            includeStack.pop();
        }
        return res;
    };
    const R = (src: string) => state ? src : '';
    const If = (condition: boolean) => {
        return createIncludeFn(shader, condition);
    };
    const fn = { defined, include, If, R };
    return fn;
};
const vertexSource = (shader: ShaderSource) => {
    const { defined, include, If } = createIncludeFn(shader);
    return `
${include('VertexDeclare')}

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
    ${defined('TEX_CUBE') ? `${_('v_cubeUv')} = a_pos/${_('u_CubeSize')};` : `v_color = a_color;`}
    v_normal = mat3(u_world) * a_normal;
    ${If(defined('CUBE', 'TEX_2D')).R('v_isTex=a_isTex;')}
}`;
};

const fragmentSource = (shader: ShaderSource) => {
    const { defined, include, If } = createIncludeFn(shader);
    return (`
precision mediump float; // 默认精度

${include('FragmentDeclare')}

varying vec3 v_normal;

${If(defined('LIGHT')).include('LIGHT')}


void main() {
    vec3 normal = normalize(v_normal);
    ${defined('TEX_CUBE') ? `gl_FragColor = textureCube(${_('u_texture')},${_('v_cubeUv')}-.5);` :
            defined('TEX_2D', 'CUBE') ? include('CUBE_COLOR_TEX_MIX') :
                'gl_FragColor = v_color;'}
    ${If(defined('DIRECTIONAL_LIGHT')).include('DIRECTIONAL_LIGHT')}
}
`);
};

addInclude('DIRECTIONAL_LIGHT', ({ include, defined }) => `
    float allLight = 0.0;
    for (int i = 0; i < ${ _('NUM_DIRECTIONAL_LIGHT')}; i++) {
        float light = lightFactor(normal, ${ _('u_lightDirectional')}[i]);
        allLight += light;
    }
    gl_FragColor.rgb *= allLight; `
);

addInclude('LIGHT', ({ include, defined }) => `
    float lightFactor(vec3 normal, vec3 light) {
        return max(dot(normal, light), .0);
    }`
);


// 立方体贴图颜色混合传输vec3的
addInclude('CUBE_COLOR_TEX_MIX', ({ include, defined }) => `

`
);