import { DirectionalLight } from '../light/directionLight';

export type defineEnum =
    'LIGHT' |
    'DIRECTIONAL_LIGHT';

export type variableEnum =
    typeof DirectionalLight.varNameDirectional;

export type variableType = {
    name: variableEnum;
    type: 'attribute' | 'uniform' | 'varying';
    varType: 'mat3' | 'mat4' | 'vec3';
    target: 'all' | 'vertex' | 'fragment'
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
        const variable = this.variableArray;
        variable.filter(x => x.type === 'uniform').forEach(x => {
            if (x.target === 'all' || x.target === 'fragment') {
                fragment += `${x.type} ${x.varType} ${x.name};`;
            }
            if (x.target === 'all' || x.target === 'vertex') {
                vertex += `${x.type} ${x.varType} ${x.name};`;
            }
        });
        variable.filter(x => x.type === 'attribute').forEach(x => {
            if (x.target === 'all' || x.target === 'fragment') {
                fragment += `${x.type} ${x.varType} ${x.name};`;
            }
            if (x.target === 'all' || x.target === 'vertex') {
                vertex += `${x.type} ${x.varType} ${x.name};`;
            }
        });
        variable.filter(x => x.type === 'varying').forEach(x => {
            if (x.target === 'all' || x.target === 'fragment') {
                fragment += `${x.type} ${x.varType} ${x.name};`;
            }
            if (x.target === 'all' || x.target === 'vertex') {
                vertex += `${x.type} ${x.varType} ${x.name};`;
            }
        });
        vertex = vertex + vertexSource;
        fragment = fragmentSource.replace('{{insert}}',fragment);
        return {
            vertex,
            fragment
        };
    }
    public addDefine(def: defineEnum) {
        this.define.add(def);
    }
    public addVariable(
        target: 'all' | 'vertex' | 'fragment',
        type: 'attribute' | 'uniform' | 'varying',
        varType: 'mat3' | 'mat4' | 'vec3',
        name: variableEnum) {
        this.variable.add({ name, type, varType, target });
    }
}

const vertexSource = `
uniform mat4 u_proj;
uniform mat4 u_view;
uniform mat4 u_model;
uniform mat4 u_world;
uniform vec3 u_viewWorldPos;
attribute vec3 a_pos;
attribute vec3 a_color;
attribute vec3 a_normal;
varying vec3 v_normal;
varying vec3 v_color;

void main() {
    vec4 worldPos = u_model * vec4(a_pos,1); 
    gl_Position =   u_proj * u_view * worldPos;
    v_color = a_color; 
    v_normal = mat3(u_world) * a_normal;
}`;


const fragmentSource = `
precision mediump float; // 默认精度
{{insert}}
varying vec3 v_color;
varying vec3 v_normal;


#ifdef LIGHT
    float lightFactor(vec3 normal,vec3 light) {
        return max(dot(normal,light),.0);
    }
#endif

void main() {
    vec3 normal = normalize(v_normal);
    gl_FragColor = vec4(v_color, 1);
#ifdef DIRECTIONAL_LIGHT
    float light = lightFactor(normal, ${DirectionalLight.varNameDirectional});
    gl_FragColor.rgb *= light;
#endif
}
`;

