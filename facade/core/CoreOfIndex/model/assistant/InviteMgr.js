let facade = require('../../../../Facade')
let {ReturnCode} = facade.const
let baseMgr = facade.Assistant;

/**
 * 各类交互性申请、邀请综合管理，例如入盟申请、加盟邀请
 */
class InviteManager extends baseMgr
{
    constructor(parent){
        super(parent, 'invite');
        this.items = [];
    }

    /**
     * 反序列化
     * @param $params
     */
    LoadData($params) {
        if(!!$params){
            for(let $it of $params.split(';')) {
                let $pm = $it.split(',');
                if($pm.length >= 2 && $pm[0] != '' && $pm[1] != ''){
                    this.items.push({'type' : $pm[0], 'num' : $pm[1]});
                }
            }
        }
    }

    /**
     * 序列化
     * @return string
     */
    ToString() {
        let $ret = '';
        for(let $value of this.items) {
            if($value['num'] <= 0){
                continue;
            }

            if($ret != ''){ $ret += ';'; }
            $ret += $value['type'] + ',' + $value['num'];
        }
        return $ret;
    }

    /**
     * 获取指定类型邀请的列表
     * @param int $rt       类型
     * @return array        编号列表，例如联盟ID
     */
    Value($rt) {
        let $ret = [];
        for(let $value of this.items){
            if($value['type'] == $rt){
                $ret.push($value['num']);
            }
        }
        return $ret;
    }

    /**
     * 记录邀请
     * @param int $rt       类型
     * @param int $num      编号
     * @return {InviteManager}
     */
    Set($rt, $num) {
        for(let $value of this.items){
            if($value['type'] == $rt && $value['num'] == $num){
                return this;
            }
        }

        this.dirty = true; //设置脏数据标志
        this.items.push({'type' : $rt, 'num' : $num});

        return this;
    }

    /**
     * 清除邀请
     * @param int $rt       类型
     * @param int $num      邀请的发起方，如果为0表示匹配所有
     * @return int          操作结果码
     */
    Clear($rt, $num = 0) {
        this.items.array_delete($value=>{
            if($value['type'] == $rt && ($num == 0 || $num == $value['num'])){
                this.dirty = true;
                return true;
            }
        });
        return ReturnCode.Success;
    }

    hasInvite($rt, $num) {
        for(let $value of this.items){
            if($value['type'] == $rt && $value['num'] == $num){
                return true;
            }
        }
        return false;
    }
}


exports = module.exports = InviteManager;
