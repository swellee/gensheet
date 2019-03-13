const path = require("path");
const fs = require("fs");
const xlsx = require("node-xlsx");
const dust = require("./dust");

//-----------data vars------------
const SHEET_HEADS = 3; //表头所占据的行数

//支持的字段类型
const TYPE_TAG = {
    STR: "Str",
    STRS: "Strs",
    INT: "Int",
    INTS: "Ints",
    ITEM: "Item",
    ITEMS: "Items"
}

const CONST_NAME = 'const';

const OUT_TAG = {
    CLIENT: ".C",
    SERVER: ".S",
}

class Field {
    constructor(name, cmts) {
        this.name = name;
        this.comments = cmts;
    }
}

class Sheet {
    constructor(shtName) {
        this.fileds = [];
        this.sheetname = shtName;
        this.classname = shtName.substr(0, 1).toUpperCase() + shtName.substr(1);
        this._consts = [];
    }

    consts(k, v) {
        this._consts.push({k: k.toUpperCase(), v: v})
    }
}

class Data {
    constructor() {
        this.jsondata = {};
        this.sheets = [];
    }

    get json() {
        return JSON.stringify(this.jsondata);
    }
}

//-------------enter---------------------------------
//读取配置
let curFl, curSheet;
const cfg = require('./config');
const parsedData = {
    client: new Data(),
    server: new Data()
}

//开始处理
Promise.all(Object.keys(cfg).map(key => {
    gen(key, cfg[key]);
})).then(() => {
    console.log('处理完成！')
})
//--------------end----------------------------------

//-------------functions------------------
async function gen(cfgKey, cfgNode) {
    if (!cfgNode.enable) {
        return;
    }

    let inDir = cfgNode.inDir;
    let outFileC = cfgNode.outFileC;
    let outFileS = cfgNode.outFileS;

    //判断inDir是文件夹，还是文件
    let st = fs.statSync(inDir);
    if (st.isFile()) {
        parseFile(inDir);
    }
    else {
        let files;
        try {
            files = fs.readdirSync(inDir).map(f => {
                return path.resolve(inDir, f);
            })
        } catch (e) {
            console.error(e)
            console.warn(`未找到${cfgKey}的inputDir配置的目标路径：${inDir} 请检查后重试！！！`);
            return;
        }

        //开始读表转换
        files.every(f => {
            parseFile(f);
        })
    }


    //写入output文件
    if (cfgNode.splitC) {
        // 客户端按sheet拆分
        let clientDatas = parsedData.client.jsondata;
        let outdirC = path.dirname(outFileC);
        let fileExt = path.extname(outFileC);
        await dust.gen(cfgNode.tplName, ...Object.keys(clientDatas).map(key => {
            let dt = clientDatas[key];
            let jsondata = {[key]: dt};
            return {
                data: {sheets: parsedData.client.sheets.filter(s => s.sheetname == key), jsondata, json: JSON.stringify(jsondata) },
                outfile: path.join(outdirC, `client_${key}.${fileExt}`)
            };
        }))
        
    }
    else if (cfgNode.chunkC) {
        //客户端切分
        let clientDatas = parsedData.client.jsondata;
        let chunk = {};
        let chunks = [];
        let chunkStr = '';
        for (let key in clientDatas) {
            let dt = clientDatas[key];
            let dtStr = JSON.stringify(dt);
            chunkStr += dtStr

            //判断是否存在单表就已超限的情况
            let sheetLen = Buffer.byteLength(dtStr);
            if (sheetLen >= cfgNode.chunkC) {
                let sliceNum = Math.round(sheetLen / cfgNode.chunkC);
                let sheetArr = Object.keys(dt);

                //单表拆分
                let sheetArrLen = sheetArr.length;
                let sliceStep = Math.floor(sheetArrLen / sliceNum);
                let sliceIdx = 0;
                let subsheets = [];
                while (sliceIdx < sheetArrLen) {
                    let sliceEnd = sliceStep + sliceIdx;
                    subsheets.push(sheetArr.slice(sliceIdx, sliceEnd))
                    sliceIdx = sliceEnd;
                }

                //生成chunks
                subsheets.every(subs => {
                    let subchunk = {};
                    subchunk[key] = subs.map(k => {
                        return {[k]: dt[k]};
                    })
                    chunks.push(subchunk);
                    return true;
                })

            }
            else {
                //累计超限
                if (Buffer.byteLength(chunkStr) >= cfgNode.chunkC) {

                    //生成新的
                    chunks.push(chunk);
                    chunk = {};
                    chunkStr = '';
                }
                else {
                    //未超标
                }

                chunk[key] = dt;
            }

        }

        if (chunks.indexOf(chunk) == -1) {
            chunks.push(chunk);
        }

        let outdirC = path.dirname(outFileC);
        let fileExt = path.extname(outFileC);
        let gens = chunks.map((c, idx) => {
            let chunkFile = path.join(outdirC, `data${idx}.${fileExt}`);

            return {data: {json: JSON.stringify(c)}, outfile: chunkFile}
        });
        await dust.gen(cfgNode.chunkTplNames[1], ...gens);
        await dust.gen(cfgNode.chunkTplNames[0], {
            data: {sheets: parsedData.client.sheets, chunks, chunkCnt: chunks.length},
            outfile: outFileC
        });
        await dust.gen(cfgNode.tplName, {data: parsedData.server, outfile: outFileS});
    }
    else {
        //不切分，正常写入
        await dust.gen(cfgNode.tplName,
            {data: parsedData.client, outfile: outFileC},
            {data: parsedData.server, outfile: outFileS});
    }


}


function parseFile(flPath) {
    let fl = path.basename(flPath);
    curFl = flPath;
    let extName = path.extname(fl);
    if (/^[a-zA-Z]+/.test(fl) == false) {
        //文件名不能为全中文命名
        return;
    }
    if (extName == ".xlsx") {
        let sheets = xlsx.parse(flPath);
        //先筛选出有效的工作表
        let validSheets = {};
        for (let i = 0; i < sheets.length; i++) {
            let sht = sheets[i];
            sht.name = sht.name.trim();
            if (/Sheet[0-9]+/.test(sht.name)) {
                //excel 的默认表名不处理
                continue;
            }
            if (sht.data.length < SHEET_HEADS) {
                continue;
            }
            if (validSheets[sht.name]) {
                console.error(fl + "中出现了已存在过的导出表名>>" + sht.name);
            } else {
                validSheets[sht.name] = sht.data;
                mergeToJson(sht.data, sht.name, flPath);
            }
        }
    }
}

function mergeToJson(sht, sheetName, fl) {
    //sht==其中一个工作表的内容
    curSheet = sheetName;
    parsedData.client.jsondata[sheetName] = {};
    parsedData.server.jsondata[sheetName] = {};

    //先读掉前几行配置、类型、注释等
    let shtHeads = sht.slice(0, SHEET_HEADS); //表头
    let data = sht.slice(SHEET_HEADS); //数据
    let colComments = shtHeads[0]; //中文字段名
    let colNames = shtHeads[1]; //字段名
    let colFlags = shtHeads[2]; //字段导出标识

    //生成数据类声明
    let sheetClzC = new Sheet(sheetName);
    let sheetClzS = new Sheet(sheetName);

    //有效数据的起始列索引
    let colStart = 0;

    //每行数据生成一个包装单元
    for (let i in data) {
        let cellC = {};
        let cellS = {};
        let line = data[i];

        for (let k = colStart; k < colNames.length; k++) {
            let clName = colNames[k];
            let clFlag = colFlags[k];
            let clCmts = colComments[k];


            //字段过滤
            if (clName) {
                //转换数据
                clFlag = clFlag || TYPE_TAG.STR;//空值，按Str处理

                let clData = parseType(clFlag.split('.')[0], line[k]);

                //const 字段，生成类常量, 每个表只能有一个const字段，字段类型仅支持Str/Str.C/Str.S, 留空为Str,该字段列的值为转换成全部大写作为KEY，该表第一列的值为转换成与KEY对应的值
                if (clName == CONST_NAME) {

                    if (clFlag.indexOf(TYPE_TAG.STR) == -1) {
                        console.error(`const字段仅支持Str/Str.C/Str.S类型，而文件${fl}中的${sheetName}表中出现了不支持的类型，请检查修改后重新生成！！！`)
                        process.exit(1);
                    }

                    let v = line[colStart] + '';
                    if (clFlag.indexOf(OUT_TAG.CLIENT) != -1) {
                        //仅客户端
                        sheetClzC.consts(clData, v);
                    }
                    else if (clFlag.indexOf(OUT_TAG.SERVER) != -1) {
                        sheetClzS.consts(clData, v);
                    }
                    else {
                        sheetClzC.consts(clData, v);
                        sheetClzS.consts(clData, v);
                    }
                }
                else {
                    //记录数据
                    if (clFlag.indexOf(OUT_TAG.CLIENT) != -1) {
                        //此字段仅客户端使用
                        i == 0 && sheetClzC.fileds.push(new Field(clName, clCmts));
                        cellC[clName] = clData;
                    }
                    else if (clFlag.indexOf(OUT_TAG.SERVER) != -1) {
                        //此字段仅服务器使用
                        i == 0 && sheetClzS.fileds.push(new Field(clName, clCmts));
                        cellS[clName] = clData;
                    }
                    else {
                        //此字段前后端都用
                        i == 0 && sheetClzC.fileds.push(new Field(clName, clCmts));
                        i == 0 && sheetClzS.fileds.push(new Field(clName, clCmts));
                        cellC[clName] = clData;
                        cellS[clName] = clData;
                    }
                }
            }

        }

        let idName = line[colStart]
        if (idName) {
            parsedData.client.jsondata[sheetName][idName] = cellC;
            parsedData.server.jsondata[sheetName][idName] = cellS;
        }
    }

    //记录类声明
    if (sheetClzC.fileds.length) {
        parsedData.client.sheets.push(sheetClzC);
    }
    else {
        delete parsedData.client.jsondata[sheetName];
    }
    if (sheetClzS.fileds.length) {
        parsedData.server.sheets.push(sheetClzS);
    }
    else {
        delete parsedData.server.jsondata[sheetName];
    }
}


function parseType(type, data) {
    if (data || data == 0)
        data += ''//转字符串
    else
        data = '';
    switch (type) {
        case TYPE_TAG.INT:
            return parseInt(data);
        case TYPE_TAG.INTS:
            return data.split(',').map(d => parseInt(d));
        case TYPE_TAG.STRS:
            return data.split(',').map(d => parseType(TYPE_TAG.STR, d));
        case TYPE_TAG.ITEM:
            let kv = {};
            let arr = data.split(':');
            kv.k = arr[0];
            kv.v = arr[1];
            if (kv.k == 'undefined') {
                console.log('has blank row in', curSheet, curFl);
                return null;
            }
            return kv;
        case TYPE_TAG.ITEMS:
            return data.split(',').map(it => {
                return parseType(TYPE_TAG.ITEM, it);
            });
        default:// string
            return data.replace(/\n/g, "\\n");
    }

}
