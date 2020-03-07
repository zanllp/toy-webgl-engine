import { setStateType } from './Mesh/util';

/**
 * 渲染循环，rqa实现
 */
export class RenderLoop {
    /**
     * rqa的id
     */
    public rqaId?: number;
    
    /**
     * 近十次帧数的平均值
     */
    public fps: number = 0;
    
    /**
     * 整个生命周期的平均帧数
     */
    public averageFps: number = -1;
    
    /**
     * 运行状态
     */
    public state: 'run' | 'stop' = 'stop';

    /**
     * 循环次数
     */
    public count: number = 0;
    
    /**
     * 渲染任务
     */
    public renderTask?: (t: number) => any;
    
    /**
     * 任务
     */
    public task = new Array<(t: number) => any>();
    
    /**
     * 一次任务，在每次运行后都会清空
     */
	public onceTask = new Array<(t: number) => any>();
    
    /**
     * 上次记录时间
     */
    private lastRecTime = 0;
    
    /**
     * 运行循环
     */
	public run() {
		this.state = 'run';
		let lastT = Date.now();
		const loop = (t: number) => {
			this.rqaId = requestAnimationFrame(loop);
			const dt = t - lastT;
			this.task.forEach(x => x(dt));
			this.onceTask.forEach(x => x(dt));
			this.renderTask?.call(null, dt);
			lastT = t;
			if (this.onceTask.length !== 0) {
				this.onceTask = [];
			}
			this.calcFps(t);
		};
		this.rqaId = requestAnimationFrame(loop);
    }
    
    /**
     * 停止循环
     */
	public stop() {
		this.state = 'stop';
		if (this.rqaId !== undefined) {
			cancelAnimationFrame(this.rqaId);
		}
    }
    
    /**
     * 添加任务，会排除掉已存在的
     * @param tasks 
     */
	public addTask(...tasks: Array<(t: number) => any>) {
		tasks.forEach(x => {
			if (this.task.indexOf(x) === -1) {
				this.task.push(x);
			}
		});
    }
    
     /**
     * 添加一次任务，会排除掉已存在的
     * @param tasks 
     */
	public addOnceTask(...tasks: Array<(t: number) => any>) {
		tasks.forEach(x => {
			if (this.onceTask.indexOf(x) === -1) {
				this.onceTask.push(x);
			}
		});
    }
    
    /**
     * 计算帧率
     * @param t 
     */
	private calcFps(t: number) {
		this.count++;
		const recInterval = 10;
		if (this.count % recInterval === 0) {
			const dt = (t - this.lastRecTime) / recInterval;
			const fps = 1000 / dt;
			if (this.averageFps === -1) {
				this.averageFps = fps;
			} else {
				this.averageFps = (this.averageFps * (this.count - recInterval) + fps * recInterval) / this.count;
			}
			this.fps = fps;
			this.lastRecTime = t;
		}
	}
}

export type actionsType<V> = ((tDiff: number) => setStateType<V>) | { action: (tDiff: number) => setStateType<V>, once?: boolean };


/**
 * 创建多按键监听任务，用来解决直接添加监听器不能多按键同时触发的问题，创建完添加到渲染主循环里
 * @param actions 
 */
export const createKeyListenerTask = <V>(actions: { [x: string]: actionsType<V> }) => {
	const keyPressing = new Set<string>();
	document.addEventListener('keydown', x => keyPressing.add(x.code));
	document.addEventListener('keyup', x => keyPressing.delete(x.code));
	return (t: number) => {
		keyPressing.forEach((k) => {
			const p = actions[k as any];
			if (p) {
				if (typeof p === 'function') {
					p(t);
				} else {
					const { once, action } = p;
					action(t);
					if (once) { // 只执行一次
						keyPressing.delete(k);
					}
				}
			}
		});
	};
};