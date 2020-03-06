import { Model } from './model';
import { vec3, mat4 } from 'gl-matrix';

/**
 * 组合体
 */
export class Assembly extends Model {
	public constructor(...models: Array<Model>) {
		super([], []);
		for (const i of models) {
			this.color = [...this.color, ...i.color];
			if (mat4.equals(i.modelMat, mat4.create())) {
				this.position.push(...i.position);
				this.normal.push(...i.normal);
			} else {
				for (let ii = 0; ii < i.normal.length; ii += 3) {
					const _pos = i.position;
					const pos = vec3.fromValues(_pos[ii], _pos[ii + 1], _pos[ii + 2]);
					this.position.push(...Array.from(vec3.transformMat4(vec3.create(), pos, i.modelMat)));
					const _nor = i.normal;
					const normal = vec3.fromValues(_nor[ii], _nor[ii + 1], _nor[ii + 2]);
					this.normal.push(...Array.from(vec3.transformMat4(vec3.create(), normal, i.modelMat)));
				}
			}
		}
		this.type = 'Assembly';
	}
	public readonly position = new Array<number>();
	public readonly normal = new Array<number>();
	public readonly color = new Array<number>();
}
