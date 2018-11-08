/**
 * 系统维护任务, 在项目根目录运行 node run maintain，自动执行config/maintain目录下所有维护任务
 * Created by liub on 2017-06-01.
 *
 * @note
 * 1、一个维护任务是由单个文件规范的
 * 2、每个维护任务都有一个名称标识，并通过底层机制确保只能运行一次
 * 3、如果确定需要重新运行，需要手工修改config/maintain.json中相应标识对应的布尔值(执行前为false，执行后为true)
 */
class baseTask{
    /**
     * 构造函数，传入的name参数就是任务文件的文件名
     * @param {*}  
     */
    constructor($name){
        this.name = $name; //标识执行维护任务的日期
    }

    /**
     * 异步方法，返回时表示任务内容已经执行完毕
     * 返回true表示任务执行成功，否则表示任务执行失败
     */
    async Execute(){
        return true;
    }
}

exports = module.exports = baseTask;