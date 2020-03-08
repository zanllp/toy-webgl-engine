import { modifyWindow } from '../tool';

const _o = (bit: number) => 1 << bit;

export class ShaderOption {
    public value = 0;
    public static DIRECTION_LIGHT = _o(0);
    public static SPOT_LIGH = _o(1);
    public static SMAPLER_2D = _o(2);
    public static SMAPLER_CUBE = _o(3);

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

    /**
     * 转换到二进制字符串
     */
    public get t2str() {
        return this.value.toString(2);
    }

    public equal(t: ShaderOption) {
        return this.value === t.value;
    }
}

modifyWindow({ ShaderOption });