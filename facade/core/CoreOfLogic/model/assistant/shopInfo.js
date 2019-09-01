let facade = require('../../../../Facade')
let {ShopTypeEnum, em_Effect_Comm, ResType, NotifyType,ActivityType, ReturnCode} = facade.const
let Collection = require('../../../../util/Collection')
let baseMgr = facade.Assistant
let BonusObject = facade.Util.BonusObject

/**
 * 商品持久化信息管理
 */
class shopInfo extends baseMgr
{
    /**
     * 构造函数，反序列化
     * @param {UserEntity} parent
     */
    constructor(parent){
        super(parent, 'shopinfo');

        /**
         * 持久保存商店刷新时间、购买记录（用于实现限额购买）
         */
        this.list = {};
        Object.keys(ShopTypeEnum).map(key=>{
            this.list[ShopTypeEnum[key]] = {'time': 0, 'items': []};
        });
    }

    /**
     * 获取配置表中的商品列表
     * @return {Collection}
     */
    static get items(){
        if(!shopInfo.$items){
            shopInfo.$items = new Collection();
            for(let $item of this.parent.core.fileMap.pGoods){
                shopInfo.$items.set(parseInt($item.id), $item);
            }
        }
        return shopInfo.$items;
    }

    /**
     * 获取配置表中所有商店的配置信息
     */
    static get shops(){
        if(!shopInfo.$shops){
            shopInfo.$shops = {};
            let $config = this.parent.core.fileMap.pShops;
            for(let $key in $config){
                shopInfo.$shops[$key] = {
                    "mt": $config[$key].mt, 
                    "money":$config[$key].money, 
                    "max":$config[$key].max, 
                    "time":$config[$key].time
                };
            }
        }
        return shopInfo.$shops;
    }

    LoadData($info){
        if(!!$info){
            for(let $shop of $info.split('|')) {
                if($shop == ''){continue;}
    
                let $sl = $shop.split('@');
                let $type = parseInt($sl[0]);
                this.list[$type]['time'] = parseInt($sl[1]);
                for(let $item of $sl[2].split(';')){
                    if($item == ''){continue;}
    
                    let $attr = $item.split(',');
                    if($attr.length >= 2){
                        let $id = parseInt($attr[0]);
                        this.list[$type]['items'][$id] = {'cur': parseInt($attr[1])};
                    }
                }
            }
        }
    }

    /**
     * 获取序列化字符串，同时复位脏数据标志
     * @note 子类可重载此方法
     */
    ToString(){
        this.dirty = false;
        let $ret = '';
        for(let $key in this.list){
            let $shop = this.list[$key];
            if($ret != ''){
                $ret += '|';
            }
            let $attrStr = '';
            for(let $key in $shop['items']){
                let $item = $shop['items'][$key];

                if($attrStr != ''){
                    $attrStr += ';';
                }
                $attrStr += $key + ',' + (!!$item['cur'] ? $item['cur'] : '0');
            }
            $ret += $key + '@' + $shop['time'] + '@' + $attrStr;
        }
        return $ret;
    }

    /**
     * 向客户端返回指定商店的配置信息
     * @return array
     */
    GetShopConfig($type){
        if(!this.list[$type]['time']){
            this.list[$type]['time'] = facade.util.now();
            this.dirty = true;
        }
        return facade.tools.extend(
            {'lt': 3600 * shopInfo.shops[$type]['time'] - (facade.util.now() - this.list[$type]['time'])},
            shopInfo.shops[$type]
        );
    }

    /**
     * 获取商品列表
     * @param {*}  
     */
    getItems($type) {
        let ret = [];
        shopInfo.items.where([['stype', $type]]).ToArray().map($item=>{
            if(!!this.list[$type].items[$item['id']]){
                $item['cur'] = this.list[$type].items[$item['id']]['cur'];
            }
            else{
                $item['cur'] = 0;
            }
            ret.push($item);
        });
        return ret;
    }

    /**
     * 判断商店的商品列表是否需要刷新
     */
    isExpired($type){
        return this.list[$type]['time'] < facade.util.now() - shopInfo.shops[$type]['time'] * 3600;
    }

    /**
     * @param {*}  
     */
    purchase($item) {
        if(!this.list[$item.stype]['items'][$item['id']]){
            this.list[$item.stype]['items'][$item['id']] = {cur:0};
        }

        if($item['max'] > 0 && this.list[$item.stype]['items'][$item['id']]['cur'] >= $item['max']){
            return ReturnCode.Num_Limited;
        }
        else{
            this.dirty = true;
            this.list[$item.stype]['items'][$item['id']]['cur'] += 1;
            if(parseInt($item['type']) == ResType.Box){//礼包
                this.parent.getBonus(BonusObject.convert($item['tid'])); //该字段为形如 [{type:1,id:0,num:1}] 的复合字符串
            }
            else{//非礼包
                this.parent.getBonus({type:parseInt($item['type']),num:(parseInt($item['point']) + parseInt($item['freepoint']))}); //发放物品, 考虑了赠送量
            }
            return ReturnCode.Success;
        }
    }

    /**
     * 检测时间间隔并刷新商品列表
     * @param bool $force
     */
    refresh($type, $force=false){
        if($force || this.isExpired($type)){//需要刷新
            this.dirty = true;

            this.list[$type]['time'] = facade.util.now();
            this.list[$type]['items'] = {};
            let $ary = shopInfo.items.where([['stype', $type]]).ToArray().reduce((sofar,cur)=>{
                if(cur['type'] == ResType.FellowHead){ //由于新增了PVE伙伴购买，此处需要过滤已经激活的宠物项
                    if(!this.parent.getPotentialMgr().isCPetActivedByTypeId(cur['tid'])){
                        sofar.push(cur);
                    }
                }
                else{
                    sofar.push(cur);
                }
                return sofar;
            },[]);

            for(let $value of $ary.randomElement(shopInfo.shops[$type]['max'])) {
                this.list[$type]['items'][$value['id']] = {'cur': 0};
            }
        }
    }
}

exports = module.exports = shopInfo;
