let facade = require('../../Facade')
let {ResType} = facade.const
let UserEntity = facade.entities.UserEntity
let LargeNumberCalculator = require('./LargeNumberCalculator')

class BonusObject
{
    /**
	 * 获取奖励
     * @param {UserEntity} user
     * @param {*} bonus 可以是序列化字符串('[{type:1, num:1},...]'), 也可以是数组([{type:1, num:1},...])，或者单个Bonus({type:1, num:1})
     */
    static getBonus(user, bonus){
		if(!bonus){
			return;
		}

        if(bonus.constructor == String){
            BonusObject.getBonus(user, JSON.parse(bonus));
        }
        else if(bonus.constructor == Array){
            bonus.map(item=>BonusObject.$getBonus(user, item));
        }
        else{
            BonusObject.$getBonus(user, bonus);
        }
	}

    /**
	 * 将缩略型奖励字符串('1,1;2,1...')转化为奖励对象数组
     * @param bonusStr
     * @returns {*}
     */
	static convert(bonusStr){
    	return bonusStr.split(';').reduce((sofar, cur)=>{
            let info = cur.split(',');
            if(info.length == 2){
                sofar.push({type: info[0], num: parseInt(info[1])});
			}
			else if(info.length == 3){
                sofar.push({type: info[0], id: parseInt(info[1]), num: parseInt(info[2])});
			}
            return sofar;
		}, []);
    }

    /**
     * 合并同类型的奖励数量
     */
    static merge(ba){
        if(ba.constructor != Array){
            return ba;
        }

        return ba.reduce((sofar, cur)=>{
            let src = sofar.find(it=>{
                return (it.type == cur.type) && (it.id == cur.id || (!it.id && !cur.id))
            });
            if(!!src){
                src.num += cur.num;
            }
            else{
                sofar.push(cur);
            }
            return sofar;
        }, []);
    }
    
    /**
     * 获取奖励
     * @param {UserEntity} user 
     * @param {*} bonus Bonus的JSO或字符串形式({type:1, num:1})
     */
	static $getBonus(user, bonus){
        if(bonus.constructor == String){
            bonus = JSON.parse(bonus);
        }

        if(bonus.type == ResType.Box) {//包含多项奖励的礼盒，首先取得礼盒内容，然后调用 getBonus 进行领取
            let bi = facade.config.fileMap.shopdata[bonus.id];
            if(!!bi){
                BonusObject.getBonus(user, bi.bonus);
            }
        }
        else {//单项奖励
            //部分奖项并非存储于背包中的普通物品，需要特殊处理
            if(bonus.type == ResType.VIP) {//VIP有效期，做特殊处理
                user.baseMgr.vip.increase(bonus.num);
            }
            else if(bonus.type == ResType.FellowHead) {//直接购买宠物，而非碎片合成
                user.getPotentialMgr().ActiveCPet(bonus.id, false);
            }
            else if(bonus.type == ResType.ActionHead) {//购买技能
                user.getPotentialMgr().ActionAdd(bonus.id, 1);
                user.getPotentialMgr().Action(bonus.id);
            }
            else if(bonus.type == ResType.Gold){//大数型虚拟币，将num作为指数
                //添加资源
                user.getPocket().AddRes(ResType.Gold, LargeNumberCalculator.instance(1, bonus.num), false); //可以超过上限
            }
            else {//普通物品
                if(bonus.type == ResType.PetChipHead && bonus.id == 0){//特殊逻辑：生成随机碎片 2017.7.13
                    let rate = Math.random() /*随机数*/, cur = 0/*记录累计概率*/;
                    for(let rid of Object.keys(facade.config.fileMap.HeroList)) {
                        cur += parseFloat(facade.config.fileMap.HeroList[rid].rate); //从角色表中获取掉率并进行累计
                        if(rate < cur) { //本次随机数小于累计概率，找到符合条件的碎片
                            bonus.id = (parseInt(rid) + 1).toString(); 
                            break;
                        }
                    }
                } 
    
                //添加资源
                user.getPocket().AddRes(bonus.type, bonus.num, false, bonus.id); //可以超过上限
            }
            //发出事件，进行后续处理，例如任务检测等
            facade.current.notifyEvent('user.resAdd', {user:user, data:{type:bonus.type, id: !!bonus.id ? bonus.id : 0, value:bonus.num}});
        }
    }

    /**
     * 与背包进行相互确认，链上有的背包中必须有，链上没有的背包中移除，规定type为50000
     * @param {UserEntity} user 
     * @param {Array} props 
     */
    static authChain(user,props){
        //获取用户背包          示范
        let item = user.getPocket();
        //背包——>>链，如果背包中有具有上链属性的道具，而链上没有，则将背包中的道具移除
        item.forEach((element,index,a) => {
            if(element.type=="50000"){
                if(props.indexOf(element)){
                    a.splice(index,1);
                }
            }
        });
        //链——>>背包    背包中type为50000的可以上链
        for(let i in props[0]){
            if(!item[props[0][i]]){         //背包中没有当前id的道具
                   //则添加进入背包
            }
        }
    }

}

exports = module.exports = BonusObject;
