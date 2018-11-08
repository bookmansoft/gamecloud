let facade = require('../../../facade/Facade')
let {EntityType} = facade.const

function handle(event){ 
    let $user = facade.GetObject(EntityType.User, event.dst);
    if(!!$user){
        if($user.aid == event.aid){
            $user.aid = 0;//清除联盟ID
        }
    }
}

module.exports.handle = handle;
