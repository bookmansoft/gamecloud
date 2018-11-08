let facade = require('../../../facade/Facade')
let EffectManager = require('../../../facade/util/comm/EffectManager');
let baseMgr = require('../baseAssistant');

/**
 * 魔法效果管理器，管理持续性效果并持久化
 */
class EffectTimerManager extends baseMgr
{
    constructor(parent){
        super(parent);

        //Mixin EffectManager 的准备工作，以便在mixin时合并两者的构造函数
        EffectManager.prototype.mixin.apply(this);
    }
}

facade.tools.mixin(EffectTimerManager, EffectManager);

exports = module.exports = EffectTimerManager;