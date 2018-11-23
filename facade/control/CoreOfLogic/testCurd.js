let facade = require('../../Facade')
let {ReturnCode, NotifyType, EntityType} = facade.const

/**
 * 范例：增删查改
 * Updated by liub on 2017-05-05.
 */

class test extends facade.Control
{
    /**
     * 中间件设置
     */
    get middleware() {
        return ['parseParams', 'commonHandle'];
    }

    /**
     * 增
     * @param {*} user 
     * @param {*} objData 
     */
    async Create(user, objData) {
        let test = await facade.GetMapping(EntityType.User).Create(Math.random().toString());
        return {code: ReturnCode.Success, data: test.getAttr('name')};
    }

    /**
     * 改
     * @param {*} user 
     * @param {*} objData 
     */
    Update(user, objData) {
        let test = facade.GetObject(EntityType.User, objData.id);           //根据上行id查找test表中记录
        if(!!test) {
            test.setAttr('name', Math.random().toString());     //修改所得记录的item字段，下次查询时将得到新值，同时会自动存入数据库
            return {code: ReturnCode.Success, data: test.getAttr('name')};
        }
        return {code: -1};
    }

    /**
     * 查
     * @param {*} user 
     * @param {*} objData 
     */
    Retrieve(user, objData) {
        //根据上行id查找test表中记录, 注意在 get 方式时 id 不会自动由字符串转换为整型
        let test = facade.GetObject(EntityType.User, parseInt(objData.id));  
        if(!!test) {
            return {code: ReturnCode.Success, data: test.getAttr('name')};
        }
        return {code: -1};
    }

    /**
     * 删
     * @param {*} user 
     * @param {*} objData 
     */
    Delete(user, objData) {
        facade.GetMapping(EntityType.User).Delete(objData.id, true);
        return {code: ReturnCode.Success};
    }

    /**
     * 列表
     * @param {*} user 
     * @param {*} objData 
     */
    List(user, objData) {
        objData.id = objData.id || 1;
        let muster = facade.GetMapping(EntityType.User) //得到 Mapping 对象
            .groupOf() // 将 Mapping 对象转化为 Collection 对象，如果 Mapping 对象支持分组，可以带分组参数调用
            .orderby('id', 'desc') //根据id字段倒叙排列
            .paginate(5, objData.id, ['id', 'name']); //每页5条，显示第${objData.id}页，只选取'id'和'item'字段
        
        let $data = {items:{}};
        $data.total = muster.pageNum;
        $data.page = muster.pageCur;

        let $idx = (muster.pageCur-1) * muster.pageSize;
        for(let $value of muster.records()){
            $idx++ ;
            $data.items[$idx] = {id: $value['id'], item: $value['name'], rank: $idx};
        }

        return {code: ReturnCode.Success, data: $data};
    }

    /**
     * 向消息发送者推送一条消息
     * @param user
     * @param objData
     * @returns {Promise.<void>}
     */
    async notify(user, objData) {
        user.notify({type: NotifyType.test, info:objData.id});   //下行通知
    }
}

exports = module.exports = test;
