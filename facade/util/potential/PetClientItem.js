/**
 * 宠物信息对象 - 客户端专用
 */
class PetClientItem
{
    constructor(){
        /**
         * 编号
         * @var int
         */
        this.i = 0;
        /**
         * 等级
         * @var int
         */
        this.l = 0;
        /**
         * 当前拥有的专用碎片数量
         * @var int
         */
        this.p = 0;
        /**
         * 当前战力
         * @var LargeNumberCalculator
         */
        this.b = 0;
        /**
         * 下一级战力
         * @var
         */
        this.bn = 0;
        /**
         * 当前强化等级
         * @var int
         */
        this.en = 0;
        /**
         * 当前进阶阶数
         * @var int
         */
        this.ad = 0;
        /**
         * 升级所需金币
         * @var
         */
        this.m = 0;
    }
}

exports = module.exports = PetClientItem;