import { mat2, mat3, mat4, vec3, vec4 } from 'gl-matrix';
import negX from './sky/skybox_nx.jpg';
import negY from './sky/skybox_ny.jpg';
import negZ from './sky/skybox_nz.jpg';
import posX from './sky/skybox_px.jpg';
import posY from './sky/skybox_py.jpg';
import posZ from './sky/skybox_pz.jpg';
import { ToyEngine } from './toyEngine';
import { ui } from './ui';
import { degToRad } from './mesh/util';
import { Model } from './mesh/model';
import { MeshLine } from './component/meshline';
import { SkyBox } from './component/skybox';
import { createKeyListenerTask } from './renderloop';
import { setCSS, trimNumber, modifyWindow, printMat } from './tool';
import { Box } from './mesh/box';
import { Sphere } from './mesh/sphere';
import { Assembly } from './mesh/assembly';
import { createProgramInfo } from './glBase';
import { Scene } from './component/scene';

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
    lookAt: null as Model | null,
    keepDist: Infinity,
    keepDistMat: null as mat4 | null,
    view2targetDist: 0
};

export class App extends ToyEngine<infoT, typeof initState> {
    constructor(gl: WebGLRenderingContext) {
        super(gl, createInfo(gl), initState);
        const setS = this.setState;
        window.addEventListener('resize', this.resize.bind(this));
        document.addEventListener('wheel', x => {
            const { state } = this;
            const { lookAt } = state;
            const direction = x.deltaY / Math.abs(x.deltaY);
            const scaleFactor = 1 + (direction * .1);
            if (lookAt === null) {
                return setS({ scale: state.scale * scaleFactor });
            } else {
                if (state.keepDist !== Infinity) {
                    this.setState({ keepDist: state.keepDist * scaleFactor });
                } else {
                    const tPos = lookAt.modelPos;
                    const vPos = this.camerePos;
                    const dis = vec3.sub(vec3.create(), vPos, tPos);
                    this.camerePos = vec3.add(vec3.create(), tPos, vec3.scale(vec3.create(), dis, scaleFactor));
                }
            }
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
                const { state } = this;
                const { lookAt } = state;
                if (lookAt !== null) {
                    let mat: mat4;
                    if (state.keepDistMat) {
                        mat = state.keepDistMat;
                        mat4.rotateY(mat, mat, movementX / 400);
                        mat4.rotateX(mat, mat, movementY / 400);
                        this.setState({ keepDistMat: mat });
                    } else {
                        const tPos = lookAt.modelPos;
                        const vPos = this.camerePos;
                        const dis = vec3.sub(vec3.create(), vPos, tPos);
                        mat = mat4.create();
                        mat4.rotateY(mat, mat, movementX / 400);
                        mat4.rotateX(mat, mat, movementY / 400);
                        this.camerePos = vec3.add(vec3.create(), tPos, vec3.transformMat4(vec3.create(), dis, mat));
                    }
                } else {
                    setS(y => ({
                        rotateCameraX: y.rotateCameraX - movementY / 20,
                        rotateCameraY: y.rotateCameraY - movementX / 5,
                    }));
                }
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
        this.createUi();
        const meshLine = new MeshLine({ range: 16000, num: 100, gl });
        const skyBox = new SkyBox(gl, { posX, posY, posZ, negX, negY, negZ });
        this.renderQuene.push(this.model.scene, skyBox, meshLine);
    }
    public model = createModel(this.gl, this.info);
    public clicked = false;

    public render() {
        const { info } = this;
        let s = this.state;
        if (s.lookAt) {
            const tPos = s.lookAt.modelPos;
            if (s.keepDistMat && s.keepDist !== Infinity) { // 保持与目标的距离
                const distVec = vec3.scale(vec3.create(), [1, 0, 0], s.keepDist); // 目标指向
                const mat = mat4.create();
                mat4.translate(mat, mat, tPos); // chrome在低的保持距离下会发生振动，不知道原因
                mat4.mul(mat, mat, s.keepDistMat);
                vec3.transformMat4(distVec, distVec, mat);
                this.camerePos = distVec;
            }
            this.setState({ view2targetDist: vec3.dist(tPos, this.camerePos) });
        }
        s = this.state;
        // 右向左（倒）移动物体坐标，左向右（顺）移动坐标轴
        const { ele } = info;
        const { box0, sphere } = this.model;
        const lightMat = mat4.create();
        mat4.fromYRotation(lightMat, degToRad(1));
        const res = vec3.transformMat4(vec3.create(), s.light, lightMat);
        ele.u_lightDirectional = res;
        this.setState({ light: Array.from(res) });
        ele.u_shininess = s.shininess;
        ele.u_viewWorldPos = this.camerePos;
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
        this.setViewMat(x => {
            if (s.lookAt) {
                mat4.lookAt(x, this.camerePos, s.lookAt.modelPos, [0, 1, 0]);
            } else {
                mat4.translate(x, x, this.camerePos.map(_ => -_) as vec3);
                mat4.rotateX(x, x, degToRad(s.rotateCameraX));
                mat4.rotateY(x, x, degToRad(s.rotateCameraY));
                mat4.scale(x, x, [s.scale, s.scale, s.scale]);
            }
        });
    }

    public get camerePos() {
        const s = this.state;
        return vec3.fromValues(s.x, s.y, s.z);
    }

    public set camerePos(pos: vec3) {
        this.setState({ x: pos[0], y: pos[1], z: pos[2] });
    }

    private createUi() {
        const setS = this.setState;
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
        const createLi = (s: string | HTMLLIElement, target: any = undefined, onclick?: (li: HTMLLIElement) => any) => {
            let m: HTMLLIElement;
            if (typeof s === 'string') {
                m = document.createElement('li');
                m.innerText = s;
            } else {
                m = s;
            }
            m.className = 'model-select';
            m.addEventListener('click', e => {
                if (target !== undefined) {
                    this.setState({ lookAt: target });
                }
                onclick?.call(null, m);
                e.stopPropagation();
            });
            return m;
        };
        const tree = (f: Element, models: any[]) => {
            const s = document.createElement('ul');
            f.appendChild(s);
            models.forEach((v, i) => {
                if (v instanceof Model) {
                    const m = createLi(`${v.type}-${i}`, v);
                    s.appendChild(m);
                    tree(m, v.childArray);
                }
            });
            return s;
        };
        const keepDist = createLi('保持距离', undefined, li => {
            const s = this.state;
            if (s.keepDist === Infinity && s.lookAt) { // 必须在注视某个目标的情况下
                const vPos = this.camerePos;
                const tPos = s.lookAt.modelPos;
                const dist = vec3.dist(vPos, tPos);
                li.innerText = `当前与目标保持距离:keepDist`;
                this.setState({ keepDist: dist, keepDistMat: mat4.create() });
            } else {
                li.innerText = '当前不保持距离';
                this.setState({ keepDist: Infinity, keepDistMat: null });
            }
        });
        const unSelect = createLi('重置', null, () => {
            this.camerePos = vec3.fromValues(initState.x, initState.y, initState.z);
            keepDist.click();
        });

        const selectEle = tree(uic, Object.values(this.model));
        selectEle.appendChild(unSelect);
        selectEle.appendChild(keepDist);
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
            const { x, y, z, view2targetDist, scale, keepDist } = this.state;
            const lookAt = this.state.lookAt !== null ? this.state.lookAt.type : null;
            state.innerText = `部分状态 : ${JSON.stringify(trimNumber({ view: { x, y, z }, scale, lookAt, keepDist, view2targetDist }), null, 8)}`;
        }, 300);
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
    const box2 = new Box({ x: 1000, y: 1000, z: 1000, color: 'rand', });
    const box = new Box({ x: 999, y: 999, z: 999, color: 'rand', reverse: true });
    const asm = new Assembly(box, box2);
    asm.setModelMat(x => mat4.translate(x, x, [1500, 0, 500]));
    const scene = new Scene(gl, info.ele, box0, sphere, asm);
    return { scene, box0, sphere, asm };
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

