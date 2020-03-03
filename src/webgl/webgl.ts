import { mat2, mat3, mat4, vec3, vec4 } from 'gl-matrix';
import negX from './sky/neg-x.jpg';
import negY from './sky/neg-y.jpg';
import negZ from './sky/neg-z.jpg';
import posX from './sky/pos-x.jpg';
import posY from './sky/pos-y.jpg';
import posZ from './sky/pos-z.jpg';
// tslint:disable-next-line: max-line-length
import { array2Vec3, Box, BufferData, createKeyListenerTask, createProgramInfo, degToRad, getClassName, GL, Mesh, Model, modelMat2WorldMat, modifyWindow, Point, printMat, Scene, setCSS, Sphere, TexData, Texture } from './tool';
import { ui } from './ui';

modifyWindow({ mat3, printMat, vec3, vec4, mat2, mat4, d2r: degToRad });
export const webgl = (gl: WebGLRenderingContext) => {
    setTimeout(() => {
        const app = new App(gl);
        app.loop.run();
        document.querySelector('#hint')?.remove();
    });
};

type infoT = ReturnType<typeof createInfo>;
const initState = {
    z: 1600, y: 600, x: 0,
    rotateCameraY: 0, rotateCameraX: 0, scale: 0.3,
    rotateY: 0, rotateX: 0,
    t: 0,
    shininess: 60,
    light: [1, 1, 1],
    lookAt: null as Model | null

};

export class App extends GL<any, typeof initState> {
    constructor(gl: WebGLRenderingContext) {
        super(gl, createInfo(gl), initState);
        const setS = this.setState;
        window.addEventListener('resize', () => {
            const { gl, model } = this;
            this.resize();
            model.scene.setProjection(degToRad(45), gl.canvas.width / gl.canvas.height, 1, 4000);
            model.scene2.setProjectionMat(model.scene.projectionMat);
            this.renderFrame();
        });
        document.addEventListener('wheel', x => {
            const direction = x.deltaY / Math.abs(x.deltaY);
            return setS(_ => ({ scale: _.scale * (1 + (direction * .1)) }));
        });
        document.addEventListener('mousedown', x => {
            if (x.buttons === 1) {
                this.clicked = true;
            }
        });
        document.addEventListener('mouseup', x => {
            if (x.buttons === 0) {
                this.clicked = false;
            }
        });
        document.addEventListener('mousemove', x => {
            if (this.clicked) {
                const { movementX, movementY } = x;
                setS(y => ({
                    rotateCameraX: y.rotateCameraX - movementY / 20,
                    rotateCameraY: y.rotateCameraY - movementX / 5,
                }));
            }
        });
        const keyTask = createKeyListenerTask({
            ArrowLeft: t => setS({ action: 'decr', key: 'rotateCameraY', value: t / 20 }),
            ArrowDown: t => setS({ action: 'decr', key: 'rotateCameraX', value: t / 20 }),
            ArrowUp: t => setS({ action: 'incr', key: 'rotateCameraX', value: t / 20 }),
            PageUp: t => setS({ action: 'incr', key: 'y', value: t / 5 }),
            PageDown: t => setS({ action: 'decr', key: 'y', value: t / 5 }),
            KeyW: t => setS({ action: 'decr', key: 'z', value: t / 5 }),
            KeyS: t => setS({ action: 'incr', key: 'z', value: t / 5 }),
            KeyA: t => setS({ action: 'decr', key: 'x', value: t / 5 }),
            KeyD: t => setS({ action: 'incr', key: 'x', value: t / 5 }),
            KeyQ: t => setS({ action: 'decr', key: 'rotateCameraY', value: t / 50 }),
            KeyE: t => setS({ action: 'incr', key: 'rotateCameraY', value: t / 50 }),
            KeyX: t => setS({ action: 'incr', key: 't', value: t / 5000 })
        });
        this.loop.addTask(t => setS({ action: 'incr', key: 't', value: t / 5000 }));
        this.loop.addTask(keyTask);
        const uic = document.querySelector('#dashboard')!;
        const fps = document.createElement('span');
        const state = document.createElement('span');
        setCSS({
            whiteSpace: 'pre',
            display: 'block',
            textAlign: 'right',
            margin: '8px'
        }, fps);
        setCSS({
            whiteSpace: 'pre',
            display: 'block',
            margin: '8px'
        }, state);
        uic.appendChild(fps);


        const createLi = (s: string, target: any = null) => {
            const m = document.createElement('li');
            m.innerText = s;
            m.className = 'model-select';
            m.addEventListener('click', e => {
                this.setState({ lookAt: target });
                e.stopPropagation();
            });
            return m;
        };
        const tree = (f: Element, models: any[]) => {
            const s = document.createElement('ul');
            f.appendChild(s);
            models.forEach(v => {
                if (!(v instanceof Scene)) {
                    const m = createLi(getClassName(v), v);
                    s.appendChild(m);
                    tree(m, (v as any).children);
                }
            });
            return s;
        };
        const unSelect = createLi('不选择');
        const selectEle = tree(uic, Object.values(this.model));
        selectEle.appendChild(unSelect);
        const hint = document.createElement('span');
        hint.innerText = '选择注视目标';
        selectEle.insertBefore(hint, selectEle.firstChild);

        const s = this.state;
        ui.setupSlider('#rotate-y', { value: s.rotateY, slide: (x: any) => setS({ rotateY: x }), min: -360, max: 360 });
        ui.setupSlider('#rotate-x', { value: s.rotateX, slide: (x: any) => setS({ rotateX: x }), min: -360, max: 360 });
        ui.setupSlider('#range-shininess', { value: s.shininess, slide: (x: any) => setS({ shininess: x }), min: 1, max: 100, step: 1 });

        ui.container!.append(state);
        setInterval(() => {
            const { loop } = this;
            fps.innerText =
                `fps:${loop.fps.toFixed(2)}
平均fps:${loop.averageFps.toFixed(2)}`;
            const { x, y, z, light, scale } = this.state;
            const lookAt = this.state.lookAt !== null ? getClassName(this.state.lookAt) : null;
            state.innerText = `部分状态 : ${JSON.stringify({ x, y, z, light, scale, lookAt }, null, 4)}`;
        }, 300);
    }
    public model = createModel(this.gl, this.info);
    public clicked = false;

    render() {
        const { info, gl } = this;
        const s = this.state;
        // 右向左（倒）移动物体坐标，左向右（顺）移动坐标轴
        const { ele } = info;
        const { scene, scene2, box0, sphere } = this.model;
        const lightMat = mat4.create();
        mat4.fromYRotation(lightMat, degToRad(1));
        const res = vec3.transformMat4(vec3.create(), s.light, lightMat);
        ele.u_lightDirectional = res;
        this.setState({ light: Array.from(res) });
        ele.u_shininess = s.shininess;
        const viewPos = [s.x, s.y, s.z];
        ele.u_viewWorldPos = array2Vec3(viewPos);
        box0.pushMat(x => {
            box0.popMat();
            mat4.translate(x, x, [50, 50, 50]);
            mat4.rotateX(x, x, degToRad(s.rotateX));
            mat4.rotateY(x, x, degToRad(s.rotateY));
            mat4.translate(x, x, [-50, -50, -50]);// 立方体需要矫正位置，因为球的中心点就在后左底三面相交点
        });
        let i = 1;
        sphere.children.forEach(x => {
            if (i === 3 + 1) {
                x.pushMat(mat1 => {
                    x.popMat();
                    const r = 600 + 400 * i ** 1.4;
                    const xp = r * Math.cos(s.t / i);
                    const zp = r * Math.sin(s.t / i);
                    mat4.translate(mat1, mat1, [xp, 150, zp]);
                    mat4.rotateY(mat1, mat1, degToRad(s.t * 300));
                });
                const c = x.childArray[0];
                c.pushMat(mat => {
                    const r = 300;
                    const xp = r * Math.cos(s.t * 10 / i);
                    const zp = r * Math.sin(s.t * 10 / i);
                    c.popMat();
                    // 抵消父级的自转
                    mat4.rotateY(mat, mat, -degToRad(s.t * 300));
                    // 斜45°公转
                    mat4.rotateZ(mat, mat, degToRad(45));
                    mat4.translate(mat, mat, [xp, 0, zp]);
                    // 自转
                    mat4.rotateY(mat, mat, degToRad(s.t * 150));
                });
            } else {
                x.pushMat(mat => {
                    x.popMat();
                    const r = 600 + 400 * i ** 1.4;
                    const xp = r * Math.cos(s.t / i);
                    const zp = r * Math.sin(s.t / i);
                    mat4.translate(mat, mat, [xp, 150, zp]);
                });
            }
            i++;
        });
        scene.setViewMat(x => {
            if (s.lookAt) {
                const center = vec3.create();
                mat4.getTranslation(center, s.lookAt.finalModelmat);
                mat4.lookAt(x, viewPos, center, [0, 1, 0]);
            } else {
                mat4.translate(x, x, viewPos.map(_ => -_));
                mat4.rotateX(x, x, degToRad(s.rotateCameraX));
                mat4.rotateY(x, x, degToRad(s.rotateCameraY));
                mat4.scale(x, x, [s.scale, s.scale, s.scale]);
            }
        });
        scene2.setViewMat(scene.viewMat);
        //scene3.setViewMat(scene.viewMat);

        {
            const { cube } = info;

            gl.useProgram(cube.program);
            BufferData.write(gl, setGeometryT(), 2, cube.loc.a_pos);
            const mat = mat4.create();
            mat4.mul(mat, scene.projectionMat, modelMat2WorldMat(scene.viewMat));
            mat4.invert(mat, mat);
            cube.u_viewDirectionProjectionInverse = mat;
            gl.uniform1i(cube.loc.u_skybox, 0);

            // let our quad pass the depth test at 1.0
            gl.depthFunc(gl.LEQUAL);

            // Draw the geometry.
            gl.drawArrays(gl.TRIANGLES, 0, 1 * 6);
        }
        //gl.uniform1i(info.cube.loc.u_texture, 0);
        return [scene, scene2];
    }

}



const createModel = (gl: WebGLRenderingContext, info: infoT) => {

    const box0 = new Box({ color: 0x1453ad });
    box0.setModelMat(x => mat4.translate(x, x, [400, 0, 0]));
    const sphere = new Sphere({ radius: 400, color: 0x1890ff });
    sphere.setModelMat(x => mat4.translate(x, x, [0, 800, 0]));
    for (let i = 0; i < 6; i++) {
        const box = new Sphere({ radius: 150 + 50 * Math.random(), color: 'rand' });
        box.pushMat(x => mat4.translate(x, x, [600 + 400 * i ** 1.4, 150, -100]));
        sphere.addChild(box);
    }
    const nsp = new Sphere({ radius: 50, color: 'rand' });
    nsp.pushMat(x => mat4.translate(x, x, [300, 0, 0]));
    sphere.childArray[3].addChild(nsp);

    const scene = new Scene(gl, info.ele, box0, sphere);
    const mesh = new Mesh({ range: 8000, num: 100 });
    const point = new Point(Array.from(info.ele.u_lightPoint));
    const scene2 = new Scene(gl, info.mesh, mesh, point);
    scene.setProjection(degToRad(45), gl.canvas.width / gl.canvas.height, 1, 8000);
    scene2.setProjectionMat(scene.projectionMat);


    texture_(gl);
    //onst scene3 = new Scene(gl, info.cube, cube);
    //scene3.setProjectionMat(scene.projectionMat);
    return { scene, scene2, box0, sphere, };
};

const texture_ = (gl: WebGLRenderingContext) => {
    const texAll = { posX, posY, posZ, negX, negY, negZ };
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    Object.entries(texAll)
        .map(([k, v]) => ({ url: v, target: (Texture as any)[k] as Texture }))
        .forEach((faceInfo) => {
            const { target, url } = faceInfo;
            TexData.write(gl, 512, 512, target, null, texture);
            const image = new Image();
            image.src = url;
            image.addEventListener('load', () => TexData.writeImage(gl, image, target, texture));
        });
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

};

const createInfo = (gl: WebGLRenderingContext) => ({
    ele: createProgramInfo({
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
                u_lightDirectional: vec3.fromValues(1, 1, 1),
                u_lightPoint: vec3.fromValues(470, 30, 180),
                u_viewWorldPos: vec3.create(),
                u_shininess: 50,
            }
        },
        source: {
            vertex: vEle,
            fragment: fEle
        }
    }),
    mesh: createProgramInfo({
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
            vertex: vPanle,
            fragment: fPanle
        }
    }),
    cube: createProgramInfo({
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
            vertex: vCube,
            fragment: fCube
        }
    }),
});


const vEle = `
uniform mat4 u_proj;
uniform mat4 u_view;
uniform mat4 u_model;
uniform mat4 u_world;
uniform vec3 u_lightPoint;
uniform vec3 u_viewWorldPos;
attribute vec3 a_pos;
attribute vec3 a_color;
attribute vec3 a_normal;
varying vec3 v_normal;
varying vec3 v_color;
varying vec3 v_surface2Light;
varying vec3 v_surface2View;

void main() {
    vec4 worldPos = u_model * vec4(a_pos,1); // 自己的坐标转换成世界坐标,a_pos类型vec3是已经转置的所以要放最右边
    gl_Position =   u_proj * u_view * worldPos; // 按照model view projection也就是倒着的pvm矩阵
    v_surface2Light = u_lightPoint - worldPos.xyz;
    v_surface2View = mat3(u_view) * u_viewWorldPos - worldPos.xyz;
    v_color = a_color; 
    v_normal = mat3(u_world) * a_normal;
}`;
const fEle = `
precision mediump float; // 默认精度
uniform vec3 u_lightDirectional;
uniform float u_shininess;
varying vec3 v_color;
varying vec3 v_normal;
varying vec3 v_surface2Light;
varying vec3 v_surface2View;

float lightFactor(vec3 normal,vec3 light) {
    return max(dot(normal,light),.0);
}

// 表面反射光
float reflectLight(float light,vec3 normal,vec3 surface2View,vec3 surface2Point) {
    // 当入射光与反射光的角度越接近时，即两个向量的半向量与法线越接近时越亮
    vec3 halfVec = normalize(surface2View + surface2Point);
    float specular = .0;
    if (light > 0.0) {
      specular = pow(lightFactor(normal,halfVec), u_shininess);
    }
    return specular;
}

void main() {
    vec3 normal = normalize(v_normal);
    vec3 surface2PointLight = normalize(v_surface2Light);
    vec3 surface2View = normalize(v_surface2View);
    gl_FragColor = vec4(v_color, 1);
    float light = lightFactor(normal, surface2PointLight) + lightFactor(normal, u_lightDirectional); // 点光源 + 平行光源
    gl_FragColor.rgb *= light;
    gl_FragColor.rgb += reflectLight(light, normal, surface2View, surface2PointLight); 
}
`;

const vPanle = `
uniform mat4 u_proj;
uniform mat4 u_view;
attribute vec3 a_pos;
void main() {
    vec4 pos = vec4(a_pos,1);
    gl_Position =  u_proj * u_view * pos;
    gl_PointSize = 8.;
}`;
const fPanle = `
precision mediump float; 
void main() {
    gl_FragColor = vec4(.2,.2,.2,1);
}
`;
const vCube = `
attribute vec4 a_pos;
varying vec4 v_pos;
void main() {
  v_pos = a_pos;
  gl_Position = a_pos;
  gl_Position.z = 1.0;
}
`;

const fCube = `
precision mediump float;

uniform samplerCube u_skybox;
uniform mat4 u_viewDirectionProjectionInverse;

varying vec4 v_pos;
void main() {
  vec4 t = u_viewDirectionProjectionInverse * v_pos;
  gl_FragColor = textureCube(u_skybox, normalize(t.xyz / t.w));
}
`;

function setGeometryT() {
    return (
        [
            -1, -1,
            1, -1,
            -1, 1,
            -1, 1,
            1, -1,
            1, 1,
        ]);
}

