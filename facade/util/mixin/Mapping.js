let {IndexType} = require('../../core/CoreOfBase/define/comm')
let {now} = require('../commonFunc')
let Collection = require('../Collection')

/**
 * 实体对象的映射管理
 */
class Mapping
{
    /**
     * @return {Mapping}
     */
    static muster(cls, core) {
        if(!cls.mapParams || !core || !core.constructor.name) {
            throw new Error('class using Mapping must have mapParams function');
        }

        if(!cls.$mapping) {
            cls.$mapping = {};
        }

        if(!cls.$mapping[core.constructor.name]) {
            cls.$mapping[core.constructor.name] = new this(cls.mapParams, core);
        }

        return cls.$mapping[core.constructor.name];
    }

    /**
     * 构造函数
     * @param {*} mapParams         映射参数
     * @param {CoreOfBase} core     核心节点
     * {
            model: Test,        //对应数据库表的映射类
            entity: this,       //ORM映射类，在表映射类上做了多种业务封装
            etype: 101,         //实体类型
            group: 'item',      //(可选)对记录进行分组的键名称
        } 
     * @param {*} core          核心节点对象
     */
    constructor(mapParams, core) {
        this.core = core;
        this.init(mapParams);
    }
    /**
     * 加载所有记录
     * @returns {Mapping}
     */
    async loadAll () {
        if(!!this.entity.onLoad){
            await this.entity.onLoad(this.core.options.mysql, this.mapping.bind(this, this.core));
            if(this.entity.rankParams) {
                this.core.GetRanking(this.entity).Init();
            }
        }
        return this;
    };

    /**
     * 修改默认的分组键，并将数据集重新分组
     * @param {*} groupKey 分组键
     */
    groupBy(groupKey){
        this.keys.group = groupKey;
        for(let $key of this.idList){
            let obj = this.objects.get($key);
            if(!!obj[this.keys.group]){
                if(!this.group.has(obj[this.keys.group])){
                    this.group.set(obj[this.keys.group], new Collection());
                }
                this.group.get(obj[this.keys.group]).set($key, obj);
            }
        }
    }

    /**
     * 获取分组
     * @param {*} fkValue 
     * @return {Collection}
     */
    groupOf(fkValue){
        if(!fkValue){
            return this.objects;
        }

        if(this.group.has(fkValue)){
            return this.group.get(fkValue);
        }

        return new Collection;
    }

    /**
     * 删除分组
     * @param {*} fkValue 
     */
    groupDel(fkValue){
        let col = this.group.get(fkValue);
        if(!!col){
            col.ToArray.map(item=>{
                this.Delete(item.IndexOf(IndexType.Primary), false);
            });
            this.group.delete(fkValue);
        }
        (this.model)().destroy({
            where:{
                aid:fkValue,
            }
        });
    }

    /**
     * 删除指定记录
     * @param {*}  $id      主键
     * @param {Boolean} db  同步数据库
     */
    async Deletes($ids, db=true) {
        for(let $id of $ids) {
            let obj = this.GetObject($id);
            if(!!obj) {
                if(!!this.keys.group){
                    let g = this.group.get(obj[this.keys.group]);
                    if(!!g) {
                        g.del($id);
                    }
                }
        
                this.unMapping($id);
                if(db) {
                    await this.entity.onDelete(obj);
                }
            }
        }

        if(db) {
            await (this.model)().destroy({
                where:{
                    id: {$in: $ids},
                },
            });
        }
    }

    /**
     * 删除指定记录
     * @param {*}  $id      主键
     * @param {Boolean} db  同步数据库
     */
    async Delete($id, db=true){
        let obj = this.GetObject($id);
        if(!obj){
            return;
        }

        if(!!this.keys.group){
            let g = this.group.get(obj[this.keys.group]);
            if(!!g){
                g.del($id);
            }
        }

        this.unMapping($id);
        if(db){
            await this.entity.onDelete(obj);
            await (this.model)().destroy({
                where:{
                    id:$id,
                },
            });
        }
    }

    /**
     * 创建对象
     * @returns {Object}
     */
    async Create(...params) {
        let entity = await this.entity.onCreate(this.core.options.mysql, ...params);
        entity = this.mapping(this.core, entity);
        this.setGroup(entity);
        return entity;
    }

    /**
     * 批量创建
     * @param {*} items 
     */
    async Creates(items) {
        let entities = await (this.model)().bulkCreate(items);
        for(let entity of entities) {
            await entity.save();
            entity = this.mapping(this.core, entity);
            this.setGroup(entity);
        }
        return entities;
    }

    setGroup(entity){
        if(!!entity && !!this.keys.group){
            let $f = entity.ormAttr(this.keys.group); //获取实体对象的分组键的键值
            if(!!$f){
                if(!this.group.has($f)){
                    this.group.set($f, new Collection());
                }
                this.group.get($f).set(entity.IndexOf(IndexType.Primary), entity);
            }
        }
    }

    init(params){
        this.entity = params.entity;            //实体类，在model之上做了多种业务封装
        this.model = params.model;              //对应数据库单表的ORM封装
        this.keys = {};
        this.keys.group = params.group;         //分组键

        if(!this.mapList){
            this.mapList = Object.keys(IndexType).reduce((sofar,cur)=>{
                sofar[IndexType[cur]] = {};
                return sofar;
            }, {});

            this.idList = [];                       //所有用户的ID的集合
            this.group = new Map();
            this.objects = new Collection();
        }
    }

    /**
     * 创建反向索引
     */
    mapping(core, entity) {
        if(!!entity){   
            if(!!this.entity.onMapping){
                let pEntity = this.entity.onMapping(entity, core);
                this.objects.set(pEntity.IndexOf(IndexType.Primary), pEntity);  //将对象放入主键索引表
                this.idList.push(pEntity.IndexOf(IndexType.Primary));           //将主键放入集合
                
                //建立多种反向索引
                Object.keys(IndexType).map(key=>{
                    let value = IndexType[key];
                    if(value != IndexType.Primary){
                        this.addId([pEntity.IndexOf(value), pEntity.IndexOf(IndexType.Primary)], value);
                    }
                });

                //分组
                this.setGroup(pEntity);
                
                return pEntity;
            }
        }
        return null;
    }

    unMapping($key){
        let unit = this.objects.get($key);
        if(!!unit){
            this.objects.del($key);
            if(!!unit.domainId){
                delete this.mapList[IndexType.Domain][unit.domainId];
            }
            if(!!unit.name){
                delete this.mapList[IndexType.Name][unit.name];
            }

            let idx = this.idList.indexOf($key);
            if(idx != -1){
                this.idList.splice(idx, 1);
            }
        }
    }

    /**
     * 缓存的对象总数
     * @returns {Number}
     */
    get total(){
        return this.idList.length;
    }

    /**
     * 查询并返回和索引值相匹配的对象，查询失败返回Null
     * @param {*} index     索引值
     * @param {*} type      索引类型
     */
    GetObject(index, type = IndexType.Primary){
        switch(type){
            case IndexType.Primary:
                return this.objects.get(index);

            default:
                {
                    let id = this.getId(index, type);
                    if(!!id){
                        return this.GetObject(id)
                    }
                }
                break;
        }
        return null;
    }

    GetObjectRandom(){
        return this.GetObject(this.idList.randomElement[0]);
    }

    /**
     * 根据反向索引类型和键值，获取对象主键
     * @param {*} id    键值
     * @param {*} type  索引类型
     */
    getId(id, type){
        if(!!this.mapList[type] && !!this.mapList[type][id]){
            switch(type){
                case IndexType.Primary:
                    return id;

                case IndexType.Name:
                    {
                        let id = this.mapList[IndexType.Name][id];
                        if(!id){
                            id = this.mapList[IndexType.Name][decodeURIComponent(id)];
                        }
                        if(!id){
                            id = this.mapList[IndexType.Name][encodeURIComponent(id)];
                        }
                        return id;
                    }
                    break;
    
                case IndexType.Token:
                    if(now() - this.mapList[type][id].time < 3600*2){
                        return this.mapList[type][id].id;
                    }
                    else{
                        delete this.mapList[type][id]; //令牌过期
                    }
                    break;
    
                default:
                    return this.mapList[type][id];
            }
        }

        return 0;
    }

    /**
     * 添加反向索引
     * @param {*} id    反向索引值
     * @param {*} type  反向索引类型
     */
    addId(id, type){
        switch(type){
            case IndexType.Token:
                this.mapList[type][id[0]] = {id:id[1], time: now()};
                break;

            default:
                this.mapList[type][id[0]] = id[1];
                break;
        }
    }

    ToArray(){
        return this.objects.ToArray();
    }

    /**
     * 统计总额
     * @param {*} field 
     * @param {*} assert 
     */
    summary(field, assert){
        return this.ToArray().reduce((sofar, cur)=>{
            if(!assert || assert(cur)){
                sofar += parseInt(cur[field]);
            }
            return sofar;
        }, 0);
    }
}

exports = module.exports = Mapping;
