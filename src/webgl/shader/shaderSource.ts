import { DirectionalLight } from '../light/directionLight';
import { CubeTexture } from '../texture';

export type defineEnum =
    'LIGHT' |
    'DIRECTIONAL_LIGHT' |
    'TEX_CUBE' |
    'TEX_2D';

export type variableEnum =
    typeof DirectionalLight.varNameDirectional |
    typeof CubeTexture.varNameSize |
    typeof CubeTexture.varNameUv |
    'u_texture';

export type varType = 'attribute' | 'uniform' | 'varying';
export type dataType = 'mat3' | 'mat4' | 'vec3' | 'samplerCube' | 'sampler2d';
export type shaderType = 'all' | 'vertex' | 'fragment';

export type variableType = {
    name: variableEnum;
    varType: varType;
    dataType: dataType;
    target: shaderType
};

export class ShaderSource {
    public get variableArray() {
        return Array.from(this.variable);
    }
    public define = new Set<string>();
    public variable = new Set<variableType>();
    public output() {
        let vertex = '';
        let fragment = '';
        this.define.forEach(x => {
            vertex += `#define ${x}\n`;
            fragment += `#define ${x}\n`;
        });
        const variable = this.variableArray.sort((a, b) => a.varType.length - b.name.length);
        variable.forEach(x => {
            if (x.target === 'all' || x.target === 'fragment') {
                fragment += `${x.varType} ${x.dataType} ${x.name};\n`;
            }
            if (x.target === 'all' || x.target === 'vertex') {
                vertex += `${x.varType} ${x.dataType} ${x.name};\n`;
            }
        });
        vertex = vertexSource.replace('{{insert}}', vertex);
        fragment = fragmentSource.replace('{{insert}}', fragment);
        return {
            vertex,
            fragment
        };
    }
    public addDefine(def: defineEnum) {
        this.define.add(def);
    }
    public addVariable(target: shaderType, varType: varType, dataType: dataType, name: variableEnum) {
        this.variable.add({ name, dataType, varType, target });
    }
}

const vertexSource = `
{{insert}}

uniform mat4 u_proj;
uniform mat4 u_view;
uniform mat4 u_model;
uniform mat4 u_world;
uniform vec3 u_viewWorldPos;
attribute vec3 a_pos;
attribute vec3 a_color;
attribute vec3 a_normal;
varying vec3 v_normal;
#ifndef TEX_CUBE
varying vec3 v_color;
#endif

void main() {
    vec4 worldPos = u_model * vec4(a_pos,1); 
    gl_Position =   u_proj * u_view * worldPos;
#ifdef TEX_CUBE
    ${CubeTexture.varNameUv} = a_pos/${CubeTexture.varNameSize};
#else
    v_color = a_color;
#endif
    v_normal = mat3(u_world) * a_normal;
}`;


const fragmentSource = `
precision mediump float; // 默认精度

{{insert}}

#ifndef TEX_CUBE
varying vec3 v_color;
#endif
varying vec3 v_normal;


#ifdef LIGHT
    float lightFactor(vec3 normal,vec3 light) {
        return max(dot(normal,light),.0);
    }
#endif

void main() {
    vec3 normal = normalize(v_normal);
#ifdef TEX_CUBE
    gl_FragColor = textureCube(u_texture,  ${CubeTexture.varNameUv}-.5);
#elif defined(TEX_2D)
#error undefined TEX_2D
#else
    gl_FragColor = vec4(v_color, 1);
#endif

#ifdef DIRECTIONAL_LIGHT 
    float light = lightFactor(normal, ${DirectionalLight.varNameDirectional});
    gl_FragColor.rgb *= light;
#endif
}
`;

