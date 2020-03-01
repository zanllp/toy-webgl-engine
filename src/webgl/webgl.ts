import { mat2, mat3, mat4, vec3, vec4 } from 'gl-matrix';
import { array2Vec3, Box, createProgramInfo, degToRad, modifyWindow, printMat, Scene, createKeyListener, Sphere, Mesh, Point, GL } from './tool';

modifyWindow({ mat3, printMat, vec3, vec4, mat2, mat4, d2r: degToRad });

export const webgl = (gl: WebGLRenderingContext) => {
    setTimeout(() => {
        new App(gl).renderFrame();
        document.querySelector('#hint')?.remove();
    });
};

type infoT = ReturnType<typeof createInfo>;
const initState = {
    z: 1600, y: 600, x: 0,
    rotateCameraY: 0, rotateCameraX: 0, scale: 1,
    rotateY: 0, rotateX: 0,
    shininess: 50,
};

export class App extends GL<infoT, typeof initState> {
    constructor(gl: WebGLRenderingContext) {
        super(gl, createInfo(gl), initState);
        const setS = this.setState;
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
        createKeyListener({
            ArrowLeft: t => setS({ action: 'decr', key: 'rotateCameraY', value: t / 20 }),
            ArrowDown: t => setS({ action: 'decr', key: 'rotateCameraX', value: t / 20 }),
            ArrowUp: t => setS({ action: 'incr', key: 'rotateCameraX', value: t / 20 }),
            PageUp: t => setS({ action: 'incr', key: 'y', value: t / 20 }),
            PageDown: t => setS({ action: 'decr', key: 'y', value: t / 20 }),
            KeyW: t => setS({ action: 'decr', key: 'z', value: t / 20 }),
            KeyS: t => setS({ action: 'incr', key: 'z', value: t / 20 }),
            KeyA: t => setS({ action: 'decr', key: 'x', value: t / 20 }),
            KeyD: t => setS({ action: 'incr', key: 'x', value: t / 20 }),
            KeyQ: t => setS({ action: 'decr', key: 'rotateCameraY', value: t / 50 }),
            KeyE: t => setS({ action: 'incr', key: 'rotateCameraY', value: t / 50 }),
            KeyX: t => setS({ action: 'incr', key: 'rotateY', value: t / 5000 })
        });
    }
    public model = createModel(this.gl, this.info);
    public clicked = false;

    render() {
        const { info } = this;
        const s = this.state;
        // 右向左（倒）移动物体坐标，左向右（顺）移动坐标轴
        const { ele } = info;
        const { scene, scene2, box0, sphere } = this.model;
        ele.u_shininess = s.shininess;
        const viewPos = [s.x, s.y, s.z];
        ele.u_viewWorldPos = array2Vec3(viewPos);
        scene.setViewMat(x => {
            mat4.translate(x, x, viewPos.map(_ => -_));
            mat4.rotateX(x, x, degToRad(s.rotateCameraX));
            mat4.rotateY(x, x, degToRad(s.rotateCameraY));
            mat4.scale(x, x, [s.scale, s.scale, s.scale]);
        });
        box0.setModelMat(x => {
            mat4.translate(x, x, [50, 50, 50]);
            mat4.rotateX(x, x, degToRad(s.rotateX));
            mat4.rotateY(x, x, degToRad(s.rotateY));
            mat4.translate(x, x, [-50, -50, -50]);// 立方体需要矫正位置，因为球的中心点就在后左底三面相交点
        });
        let i = 1;
        sphere.children.forEach(x => {
            if (i === 3 + 1) {
                {
                    const mat1 = mat4.create();
                    x.popMat();
                    const r = 600 + 400 * i ** 1.4;
                    const xp = r * Math.cos(s.rotateY / i);
                    const zp = r * Math.sin(s.rotateY / i);
                    mat4.translate(mat1, mat1, [xp, 150, zp]);
                    mat4.rotateY(mat1, mat1, degToRad(s.rotateY * 300));
                    x.pushMat(mat1);
                }
                const mat = mat4.create();
                const c = x.childArray[0];
                c.popMat();
                // 抵消父级的自转
                mat4.rotateY(mat, mat, -degToRad(s.rotateY * 300));
                // 斜45°公转
                mat4.rotateZ(mat, mat, degToRad(45));
                const r = 300;
                const xp = r * Math.cos(s.rotateY * 10 / i);
                const zp = r * Math.sin(s.rotateY * 10 / i);
                mat4.translate(mat, mat, [xp, 0, zp]);
                // 自转
                mat4.rotateY(mat, mat, degToRad(s.rotateY * 300));
                c.pushMat(mat);
            } else {
                x.popMat();
                const r = 600 + 400 * i ** 1.4;
                const xp = r * Math.cos(s.rotateY / i);
                const zp = r * Math.sin(s.rotateY / i);
                const mat = mat4.create();
                x.pushMat(mat4.translate(mat, mat, [xp, 150, zp]));
            }
            i++;
        });
        scene2.setViewMat(scene.viewMat);
        return [scene, scene2];
    }

}



const createModel = (gl: WebGLRenderingContext, info: infoT) => {
    const box0 = new Box({ color: 'rand' });
    const sphere = new Sphere({ radius: 400, color: 'rand' });
    sphere.setModelMat(x => {
        mat4.translate(x, x, [0, 800, 0]);
    });
    //const largeSphere = new Sphere({ radius: 1000, latitude: { sub:2500 }, longitude: { sub:2500 }, color: 'rand' }); // 1250w面

    for (let i = 0; i < 6; i++) {
        const box = new Sphere({ radius: 150 + 50 * Math.random(), color: 'rand' });
        const mat = mat4.create();
        box.pushMat(mat4.translate(mat, mat, [600 + 400 * i ** 1.4, 150, -100]));
        sphere.children.add(box);
    }
    const nsp = new Sphere({ radius: 50, color: 'rand' });
    const mat = mat4.create();
    nsp.pushMat(mat4.translate(mat, mat, [300, 0, 0]));
    const tsp = sphere.childArray[3];
    tsp.children.add(nsp);
    const scene = new Scene(gl, info.ele, box0, sphere);
    const mesh = new Mesh({ is3d: true, range: 8000, num: 100 });
    const point = new Point(70, 30, 120);
    const scene2 = new Scene(gl, info.mesh, mesh, point);
    scene.setProjectionMat(projection => {
        // 视锥在zNear 的距离时是 2 个单位高和 2 * aspect 个单位宽。视图的范围是 -1 到 +1 
        const fieldOfView = degToRad(45);
        const aspect = gl.canvas.width / gl.canvas.height;
        const zNear = 1;
        const zFar = 4000;
        mat4.perspective(projection, fieldOfView, aspect, zNear, zFar); // 投影
    });
    scene2.setProjectionMat(scene.projectionMat);
    return { scene, scene2, box0, sphere };
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
                u_lightDirectional: vec3.fromValues(1, 1, 1),
                u_lightPoint: vec3.fromValues(70, 30, 180),
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
    v_normal = mat3(u_model) * a_normal;
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

