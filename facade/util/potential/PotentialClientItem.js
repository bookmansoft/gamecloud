class PotentialClientItem
{
    constructor(){
        /**
         * 编号
         * @var int
         */
        this.i;
        /**
         * 等级
         * @var int
         */
        this.l;
        /**
         * 加点 对法宝是圣光点 对图腾暂未启用 对宠物是当前拥有的专用碎片数量
         * @var int
         */
        this.p;
        /**
         * 对法宝是当前战力，对图腾、宠物尚未启用
         * @var LargeNumberCalculator
         */
        this.b;
        /**
         * 升级所需资源，对法宝是金币 对图腾是魂石 对宠物是金币
         * @var LargeNumberCalculator
         */
        this.m;
    }
}
exports = module.exports = PotentialClientItem;