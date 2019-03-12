//所有原始数据
let _data = {"popkeyHengda":{"Element_name":{"key":"Element_name","name":"元件","inputable":1},"Element_visible":{"key":"Element_visible","name":"是否可见","inputable":1},"Element_associatedLevelId":{"key":"Element_associatedLevelId","name":"关联楼层","inputable":1},"Element_ownerLevelId":{"key":"Element_ownerLevelId","name":"所属楼层","inputable":0},"Floor_thickness":{"key":"Floor_thickness","name":"楼板厚","inputable":0},"LevelSwitch_level":{"key":"LevelSwitch_level","name":"标高","inputable":0},"Level_height":{"key":"Level_height","name":"高度","inputable":1},"ModelLine_horizontal":{"key":"ModelLine_horizontal","name":"使水平","inputable":1},"Text_text":{"key":"Text_text","name":"文本","inputable":1},"Wall_width":{"key":"Wall_width","name":"墙厚","inputable":1}}};


class PopkeyHengda {
    constructor(d) {
    this.cfg = d;
    }

    // Key
    get key(){ return this.cfg.key; }

    // 显示的属性名
    get name(){ return this.cfg.name; }

    // popup-inputable，0不可，1可
    get inputable(){ return this.cfg.inputable; }


    static Get(id){ return id in _data.popkeyHengda ? new PopkeyHengda(_data.popkeyHengda[id]) : null; }
}


exports.popkeyHengdas = Object.values(_data.popkeyHengda);


exports.PopkeyHengda = PopkeyHengda;
