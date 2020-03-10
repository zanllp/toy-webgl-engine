import { modifyWindow } from '../tool';
import { defineEnum } from './shaderSource';

const _o = (bit: number) => 1 << bit;

export class ShaderOption {

    /**
     * 转换到二进制字符串
     */
    public get t2str() {
        return this.value.toString(2);
    }
    public value = 0;
    public readonly define = new Map<defineEnum, number | undefined>();
    public static readonly DIRECTION_LIGHT = _o(0);
    public static readonly SPOT_LIGHT = _o(1);
    public static readonly SMAPLER_2D = _o(2);
    public static readonly SMAPLER_CUBE = _o(3);
    /**
     * 设置选项啊
     * @param op 
     */
    public set(...op: number[]) {
        for (const it of op) {
            this.value |= it;
        }
        return this.value;
    }

    /**
     * 包含某个目标选项
     */
    public has(target: number) {
        const i = this.value;
        return (i & target) === target;
    }

    public equal(t: ShaderOption) {
        if (!(this.value === t.value && this.define.size === t.define.size)) {
            return false;
        }
        this.define.forEach((v, k) => {
            if (v !== t.define.get(k)) {
                return false;
            }
        });
        return true;
    }
}

modifyWindow({ ShaderOption });