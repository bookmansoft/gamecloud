let md5 = require('md5');

/**
 * 转换成 0 以上的整数
 * @param {*} num 
 */
function ZeroBaseInt(num) {
	var ret = parseInt(num);
	if (ret < 0) {
		ret = 0;
	}
	return ret;
}

/**
 * Returns a random integer between min (included) and max (included)
 * @param {Number} min 
 * @param {Number} max 
 * @return {Number}
 */
function rand(min, max) {
    return Math.round(Math.random() * (max - min)) + min;
}

/**
 * 等待若干毫秒后继续执行
 * @param {number}  - 等待的时间长度，单位毫秒
 */
async function wait($inv){
    //console.log(`waiting ${$inv/1000}s...`);
    await (new Promise(resolve=>{
        setTimeout(()=>{
            resolve();
        }, $inv);
    }));
}

/**
 * Get current time in unix time (milliseconds).
 * @returns {Number}
 */
function ms() {
    if(!!Date.now){
        return Date.now();
    }
    else{
        return +new Date();
    }
};

/**
 * Get current time in unix time (seconds).
 * @returns {Number}
 */
function now() {
    return Math.floor(ms() / 1000);
};
    
/**
 * 生成MD5签名：排除数组/对象中的 sign 字段/属性
 * @param $data     数组/对象，加密时将所有键值对排序后串接起来
 * @param secret    附加加密串，缀于串接字符串之后
 *
 * @note 采用标准md5算法，返回最终加密字符串，计算过程没有改变 $data
 */
function genGameSign($data, secret){
    //delete $data.sign;
    let base = '';
    Object.keys($data).sort().map(key=>{
        if(key != 'sign'){
            base += key + $data[key];
        }
    });
    return md5(base + secret);
}

/**
 * 取GUID
 */
function guid() {
    function s4() {
        return Math.floor((1 + Math.random() + ((new Date()).getMilliseconds()/1000)) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

/**
 * 字符串映射单个整数
 * @param str
 * @returns {number}
 */
function hashCode(str) {
    let crc = require('crc-32');
    return Math.abs(crc.str(str));
}

/**
 * 将字符串转换为表示升级资源对象的JSON
 * @param {*} str 
 * @return {Object} 描述升级所需资源的详细内容
 *      type    资源类型
 *      id      资源子类
 *      num     资源数量    
 *      step    升级步进
 */
function ToUpgradeResInfo(str){
    let ls = str.split(',');
    if(ls.length >= 4){
        return {type:parseInt(ls[0]), id: parseInt(ls[1]), num:parseInt(ls[2]), step:parseInt(ls[3])};
    }
    else if(ls.length >= 3){
        return {type:parseInt(ls[0]), id: parseInt(ls[1]), num:parseInt(ls[2])};
    }
}

//	函数导出
exports.ZeroBaseInt		= ZeroBaseInt;
exports.rand	= rand;
exports.sign = genGameSign;
exports.wait = wait;
exports.now = now;
exports.ms = ms;
exports.guid = guid;
exports.hashCode = hashCode;
exports.ToUpgradeResInfo = ToUpgradeResInfo;