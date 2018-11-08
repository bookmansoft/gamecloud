let Sequelize = require('sequelize');
var conn = require('../../util/sequel');

//建立数据库ORM模型
let User = (db, sa, pwd, host, port) => conn.seqConnector(db, sa, pwd, host, port).define(
	'user', //默认表名。一般这里写单数，生成时会自动转换成复数形式
	{//主键（id）、created_at、updated_at默认包含，不用特殊定义
		name: Sequelize.STRING,             //用户昵称，最大长度200字节
        password: Sequelize.STRING,         //登录密码，用于本地认证，如果依托QQ、360等第三方认证则无需通过该字段校验
        domain: Sequelize.STRING,           //用户来源表示，例如tx.IOS表示腾讯苹果用户，等等
		uuid: Sequelize.STRING,             //同一个domian类型下的唯一用户标识，换句话说，domain.uuid是用户的全局唯一标识
        pet: Sequelize.STRING,              //头像的URL地址，通过服务端地址中转，以避免跨域访问失败
        diamond: Sequelize.INTEGER,         //代币（钻石），单独存储，以便于检索和排序
        status: Sequelize.INTEGER,          //复合状态，表示各类特殊权限的开启和关闭
        aid: Sequelize.INTEGER,             //联盟ID
        refreshTime: Sequelize.STRING,      //刷新时间，用于控制各类随时间增长的收益

        score: Sequelize.INTEGER,           //历史最高分，单独存储，以便于检索和排序
        hisGateNo: Sequelize.INTEGER,       //历史最高关卡，单独存储，以便于检索和排序

        txinfo: Sequelize.STRING,           //腾讯社交链
        txBule: Sequelize.STRING,           //腾讯社交链
        txFriend: Sequelize.STRING,         //腾讯社交链
        friend: Sequelize.STRING,           //奴隶系统

        info: Sequelize.STRING,             //基本用户属性，复合字段
        potential: Sequelize.STRING,        //装备
        item: Sequelize.STRING,             //物品
        task: Sequelize.STRING,             //任务信息，存储已完成和进行中的任务状态
        Tollgate: Sequelize.STRING,         //关卡
        invite: Sequelize.INTEGER,          //联盟申请、邀请记录
        activity:  Sequelize.STRING,        //活动
        dailyactivity: Sequelize.STRING,    //每日活动
        execInfo: Sequelize.STRING,         //行为限制信息存储字段
        shopInfo: Sequelize.STRING,         //商品属性列表、已购买纪录的缓存
		vip: Sequelize.STRING,              //VIP系统相关
        setting: Sequelize.STRING,          //系统设定保存，诸如音乐开关、语言版本等等
	},
    {
        // 自定义表名
        'freezeTableName': true,
        'tableName': 'm_player',
        // 是否需要增加createdAt、updatedAt、deletedAt字段
        'timestamps': true,
        // true表示删除数据时不会进行物理删除，而是设置deletedAt为当前时间
        'paranoid': false
    }
);
/**
    mysql 数据类型：
        BLOB: BLOB,
        BOOLEAN: BOOLEAN,
        ENUM: ENUM,
        STRING: STRING,
        UUID: UUID,
        DATE: DATE,
        NOW: NOW,
        INTEGER: INTEGER,
        BIGINT: BIGINT,
        REAL: REAL,
        FLOAT: FLOAT,
        TEXT: TEXT
 */

exports.User = User;

