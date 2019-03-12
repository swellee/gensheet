//所有原始数据
let _data = {"popkeyCommon":{"Element_name":{"inputable":1},"Element_visible":{"inputable":1},"Element_associatedLevelId":{"inputable":1},"Element_ownerLevelId":{"inputable":0},"Floor_thickness":{"inputable":0},"LevelSwitch_level":{"inputable":0},"Level_height":{"inputable":1},"ModelLine_horizontal":{"inputable":1},"Text_text":{"inputable":1},"Wall_width":{"inputable":1}}};


class PopkeyCommon {
    constructor(d) {
    this.cfg = d;
    }

    // popup-inputable，0不可，1可
    get inputable(){ return this.cfg.inputable; }


    static Get(id){ return id in _data.popkeyCommon ? new PopkeyCommon(_data.popkeyCommon[id]) : null; }
}


exports.popkeyCommons = Object.values(_data.popkeyCommon);


exports.PopkeyCommon = PopkeyCommon;

