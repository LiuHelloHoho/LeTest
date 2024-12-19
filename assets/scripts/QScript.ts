import { _decorator, Color, Component, EditBox, EventTouch, instantiate,  Node, NodeEventType, Prefab, randomRangeInt, Sprite, Tween, tween, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('QScript')
export class QScript extends Component {
    @property(Prefab)
    private blockPrefab:Prefab;
    @property(EditBox)
    private editBoxX:EditBox;
    @property(EditBox)
    private editBoxY:EditBox;
    @property(Node)
    private blockContain:Node;
    @property(Node)
    private btnPlay:Node;
    
    private mapBlocks:{[key:string]:Node} = {};
    private colors:Color[] = [
        new Color(255,0,0,255),
        new Color(0,255,0,255),
        new Color(0,0,255,255),
        new Color(255,255,0,255),
        new Color(255,0,255,255),
    ];

    private scaleDuration: number = 0.25;
    private shakeCount: number = 5;
    private shakeAngleRange: number = 10;
    private shakeDuration: number = 0.25;

    private breathDuration: number = 0.5;
    private minScale: Vec3 = new Vec3(0.95,1,1);
    private maxScale: Vec3 = new Vec3(1.05,1,1);

    private releaseMaxScale: Vec3 = new Vec3(1.05,1.05,1);
    private releaseMinScale: Vec3 = new Vec3(0.95,0.95,1);
    private bounceCount: number = 3;

    private breathingLoop:Tween;

    onLoad(): void {
        //初始化每个块
        for(let i = 1;i <= 10;i++) {
            for(let j = 1;j <= 10;j++) {
                let block = instantiate(this.blockPrefab);
                block.parent = this.blockContain;
                block.name = i + "-" + j;
                this.mapBlocks[block.name] = block;
                block.setPosition(-330 + j * 60,330 - i * 60);
            }
        }
        // 测试案例
        const a = [10, 40, 5, 280];
        const b = [234, 5, 2, 148, 23];
        const v = 42;
        console.log("canSumToV result",this.canSumToV(a,b,v));

        this.btnPlay.setScale(Vec3.ZERO);
        // 延迟一帧后开始播放动画
        this.scheduleOnce(() => this.playAppearAnimation(), 0);
    }

    onDestroy(): void {
        this._unregisterNodeEvent();
    }

    playAppearAnimation() {
        let node = this.btnPlay;
        let self = this;
        const originalRotation = new Vec3(node.eulerAngles);
        
        // 创建缩放与回弹动作
        let scaleTween = tween(node).to(this.scaleDuration, { scale: Vec3.ONE }, { easing: 'elasticOut' });

        // 创建抖动动作
        let shakeTween = tween(node);
        for (let i = 0; i < this.shakeCount; ++i) {
            const randomAngle = (Math.random() - 0.5) * 2 * this.shakeAngleRange;
            shakeTween = shakeTween
                .to(this.shakeDuration / this.shakeCount, { eulerAngles: new Vec3(0, 0, originalRotation.z + randomAngle) })
                .to(this.shakeDuration / this.shakeCount, { eulerAngles: new Vec3(0, 0, originalRotation.z - randomAngle) });
        }
        // 回到原始角度
        shakeTween = shakeTween.to(0, { eulerAngles: originalRotation }); 

        // 合并所有动作
        let spawnActions = tween(node).parallel(scaleTween, shakeTween).call(()=>{
            self.startBreathing();
            self._registerNodeEvent();
        });

        // 开始播放动画
        spawnActions.start();
    }

    startBreathing() {
        if(this.breathingLoop) {
            this.breathingLoop.resume();
            return ;
        }
        let node = this.btnPlay;
        // 创建一个从最小缩放到最大缩放的动画
        let scaleUp = tween(node)
            .to(this.breathDuration / 2, { scale: this.maxScale }, { easing: 'sineInOut' });

        // 创建一个从最大缩放到最小缩放的动画
        let scaleDown = tween(node)
            .to(this.breathDuration / 2, { scale: this.minScale }, { easing: 'sineInOut' });

        // 将两个动画组合成一个循环
        this.breathingLoop = tween(node)
            .sequence(scaleUp, scaleDown)
            .repeatForever();

        // 开始播放循环动画
        this.breathingLoop.start();
    }

    private _registerNodeEvent() {
        this.btnPlay.on(NodeEventType.TOUCH_START, this._onTouchBegan, this);
        this.btnPlay.on(NodeEventType.TOUCH_CANCEL, this._onTouchCancel, this);
        this.btnPlay.on(NodeEventType.TOUCH_END, this._onTouchEnded, this);
    }

    private _unregisterNodeEvent() {
        this.btnPlay.off(NodeEventType.TOUCH_START, this._onTouchBegan, this);
        this.btnPlay.off(NodeEventType.TOUCH_CANCEL, this._onTouchCancel, this);
        this.btnPlay.off(NodeEventType.TOUCH_END, this._onTouchEnded, this);
    }

    private _onTouchBegan(event?: EventTouch) {
        if(this.breathingLoop){this.breathingLoop.pause();}
         // 按下时的动画效果：缩小和变暗
         let node = this.btnPlay;
         tween(node)
             .to(0.1, { scale: new Vec3(0.9,0.9,1) }, { easing: 'quadOut' })
             .start();
 
         // 改变颜色的透明度以达到变暗效果
         let color = new Color(128,128,128,255);
         tween(node.getComponent(Sprite))
             .to(0.1, { color: color }, { easing: 'quadOut' })
             .start();
    }

    private _onTouchCancel(event?: EventTouch) {
        this.resetButtonState();
    }

    private _onTouchEnded(event?: EventTouch) {
        this.resetButtonState();
    }

    private resetButtonState() {
        let node = this.btnPlay;

        // 创建回弹动画序列
        let bounceSequence = tween(node)
            .to(0.07, { scale: this.releaseMaxScale }, { easing: 'backOut' }); // 初始快速放大

        for (let i = 0; i < this.bounceCount; ++i) {
            bounceSequence = bounceSequence
                .to(0.07, { scale: this.releaseMinScale  }, { easing: 'backOut' }) // 回弹
                .to(0.07, { scale: this.releaseMaxScale }, { easing: 'backOut' });
        }

        // 最后回到原始大小
        bounceSequence = bounceSequence.to(0.07, { scale: Vec3.ONE }, { easing: 'quadOut' }).call(()=>{
            this.startBreathing();
        });

        // 启动回弹动画序列
        bounceSequence.start();

        // 恢复原始颜色
        tween(node.getComponent(Sprite))
            .to(0.4, { color: Color.WHITE }, { easing: 'quadOut' })
            .start();
    }


    /**
     * 判断数组中是否存在两个数之和等于给定值 假设 a 的长度是n b的长度是m 那么这种方法的时间复杂度就是 O(n + m)
     * @param a 数组A
     * @param b 数组B
     * @param v 给定的值
     */
    canSumToV(a: number[], b: number[], v: number): boolean {
        if(!a || !b || v === undefined) return false;
        let setA = new Set<number>();
        for (let i = 0;i < a.length;i++) {
            setA.add(a[i]);
        }
      
        for (let i = 0;i < b.length;i++) {
            let num = b[i];
            if (setA.has(v - num)) {
                // 找到合适的值就返回true
                return true;
            }
        }
        // 如果没有发现就返回false
        return false;
      }
      

    private getIndex(color:Color) {
        for(let i = 0;i < this.colors.length;i++) {
            if(color.equals(this.colors[i])) {
                return i;
            }
        }
        return -1;
    }
    /**
     * 生成所有块的颜色
     * @param x X Value
     * @param y Y Value
     */
    private generateAllBlockColor(x:number,y:number) {
        for(let i = 1;i <= 10;i++) {
            for(let j = 1;j <= 10;j++) {
                let block = this.mapBlocks[i + "-" + j];
                if(i == 1 && j == 1) {
                    block.getComponent(Sprite).color = this.colors[randomRangeInt(0,this.colors.length - 1)];
                } else {
                    let weights:number[] = [0,0,0,0,0];
                    let index1 = -1;
                    let index2 = -1;
                    // 计算概率权重
                    if(j > 1) {
                        let key = i + "-" + (j - 1);
                        let color = this.mapBlocks[key].getComponent(Sprite).color;
                        index1 = this.getIndex(color);
                        weights[index1] += x;
                    }
                    if(i > 1) {
                        let key = (i - 1) + "-" + j;
                        let color = this.mapBlocks[key].getComponent(Sprite).color;
                        index2 = this.getIndex(color);
                        weights[index2] += x;
                    }
                    if(index1 != -1 &&index1 === index2) {
                        weights[index1] += (y - x - x);
                    }
                    // 平分剩下的概率
                    let value = 0;
                    if(index1 === -1 && index2 === -1) {
                        value = 20;
                    } else if(index1 === -1 || index2 === -1) {
                        value = (100 - x)/4;
                    } else {
                        if(index1 === index2) {
                            value = (100 - y)/4;
                        } else {
                            value = (100 - x*2)/3;
                        }
                    }
                    for(let i = 0;i < weights.length;i++) {
                        if(i != index1 && i != index2) {
                            weights[i] = value;
                        }
                    }
                    // 随机取色
                    let rValue = randomRangeInt(1,101);
                    let cValue = 0;
                    for(let i =0 ;i < weights.length;i++) {
                        cValue += weights[i];
                        if(rValue <= cValue) {
                            block.getComponent(Sprite).color = this.colors[i];
                            break;
                        }
                    }

                }
            }
        }
    }

    onGenerate(btn:Node,args:string){
        let xValue = parseFloat(this.editBoxX.string);
        let yValue = parseFloat(this.editBoxY.string);
        if(isNaN(xValue) || isNaN(yValue) || xValue < 0 || yValue < 0 ) {
            return;
        }
        this.generateAllBlockColor(xValue,yValue);
    }
}


