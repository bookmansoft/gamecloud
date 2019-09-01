let facade = require('../../Facade')
let {ResType} = facade.const

class BonusObject
{
    /**
	 * 获取奖励
     * @param {UserEntity} user
     * @param {*} bonus 可以是序列化字符串('[{type:1, num:1},...]'), 也可以是数组([{type:1, num:1},...])，或者单个Bonus({type:1, num:1})
     */
    static getBonus(user, bonus){
		if(!bonus) {
			return;
		}

        if(typeof bonus == 'string') {
            BonusObject.getBonus(user, JSON.parse(bonus));
        }
        else if(Array.isArray(bonus)) {
            bonus.map(item=>BonusObject.$getBonus(user, item));
        } else {
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
        if(typeof bonus == 'string') {
            bonus = JSON.parse(bonus);
        }

        if(bonus.type == ResType.Box) {//包含多项奖励的礼盒，首先取得礼盒内容，然后调用 getBonus 进行领取
            let bi = user.core.fileMap.shopdata[bonus.id];
            if(!!bi){
                BonusObject.getBonus(user, bi.bonus);
            }
        }
        else {
            //单项奖励
            user.core.handleSpecialRes(user, bonus);
            //发出事件，进行后续处理，例如任务检测等
            user.core.notifyEvent('user.resAdd', {user:user, data:{type:bonus.type, id: !!bonus.id ? bonus.id : 0, value:bonus.num}});
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
