/**
 * 循环链表
 */
class line
{
    constructor(){
        let node = {data:{id:1}};
        this.head = node;           //头节点，不可缺失
        this.head.next = node;      //指向下一个节点
        this.head.last = node;      //指向上一个节点
        this.length = 1;            //节点总数
        this.end = this.head;       //尾节点，指向最后一个被加入的元素
    }

    /**
     * 添加指定数量的元素
     * @param {*}  
     */
    addElement($num){
        for(let i = 0; i< $num; i++){
            let node = {data:{id:this.end.data.id+1}, next:this.head, last:this.end};   //生成新节点
            this.end.next = node;   //将尾节点的next设置为新节点
            this.end = node;        //将尾节点指向新节点
            this.length++;          //递增节点数量
        }
        this.head.last = this.end;
    }

    /**
     * 
     * @param {*}  
     */
    delElement($obj){
        if(this.length == 1){
            return this.head;
        }

        this.length--;
        if($obj == this.head){
            this.head = $obj.next;
        }
        $obj.next.last = $obj.last;
        $obj.last.next = $obj.next;

        return $obj.next;
    }

    print(){
        let cur = this.head;
        do{
            console.log(cur.data);
            cur = cur.next;
        } while(cur != this.head)
    }
}

describe.skip('循环链表', function(){
    it('生成并打印循环链表', done=>{
        let l = new line;
        l.addElement(49);

        let $h = l.head;
        while(l.length >= 3){
            $h = l.delElement($h.next.next);
        }
        l.print();

        done();
    });
});
