import { mat2, mat3, mat4, vec3, vec4 } from 'gl-matrix';
import { MeshLine, Scene, SkyBox } from './component/index';
import { DirectionalLight } from './light/directionLight';
import { Assembly, Box, degToRad, Model, Sphere } from './mesh/index';
import { createKeyListenerTask } from './renderloop';
import negX from './sky/skybox_nx.jpg';
import negY from './sky/skybox_ny.jpg';
import negZ from './sky/skybox_nz.jpg';
import posX from './sky/skybox_px.jpg';
import posY from './sky/skybox_py.jpg';
import posZ from './sky/skybox_pz.jpg';
import { CubeTexture } from './texture';
import { modifyWindow, printMat, setCSS, trimNumber } from './tool';
import { ToyEngine } from './toyEngine';
import { ui } from './ui';

const cubeTex = new CubeTexture({ posX, posY, posZ, negX, negY, negZ });
modifyWindow({ mat3, printMat, vec3, vec4, mat2, mat4, d2r: degToRad });
export const webgl = (gl: WebGLRenderingContext) => {
    setTimeout(() => {
        const app = new App(gl);
        app.loop.stopOnError = true;
        app.loop.run();
        document.querySelector('#hint')?.remove();
    });
};

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

export class App extends ToyEngine<typeof initState> {
    constructor(gl: WebGLRenderingContext) {
        super(gl, initState);
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
        const skyBox = new SkyBox(gl, new CubeTexture({ posX, posY, posZ, negX, negY, negZ }));
        this.renderQuene.push(skyBox);
        this.renderQuene.push(this.model.scene, meshLine);
    }
    public model = createModel(this.gl);
    public clicked = false;

    public render(t: number) {
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
        const { box0, sphere } = this.model;
        const { material } = box0;
        if (material) {
            material.switch2BindProgram();
            this.gl.uniform1i(material.getUnifLoc('u_texture'), 0);
        }
        const lightMat = mat4.create();
        mat4.fromYRotation(lightMat, degToRad(t / 16));
        const res = vec3.transformMat4(vec3.create(), s.light, lightMat);
        this.model.light.directional = res;
        this.setState({ light: Array.from(res) });
        //ele.u_shininess = s.shininess;
        //ele.u_viewWorldPos = this.camerePos;
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



const createModel = (gl: WebGLRenderingContext) => {
    const box0 = new Box({ texture: cubeTex, x: 512, y: 512, z: 512 });
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
    const scene = new Scene(gl, box0, sphere, asm);
    const light = new DirectionalLight();
    scene.light.push(light, new DirectionalLight([1, 0, 0]));
    return { scene, box0, sphere, asm, light };
};

