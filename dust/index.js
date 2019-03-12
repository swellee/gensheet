const tpl = require("dustjs-linkedin");
const mkdirp = require("mkdir-p");
const path = require("path");
const fs = require("fs");

exports.trimWrap = false;//是否合并多个空行
/**
 * @param tplName 模板文件名，模板文件统一放在tools/dust/里，调用时传入文件名，如sheet
 * @param sets 可传入一个或多个{data, outfile}形式的参数，其中data为要输出的数据，outfile为要输入的文件名（全路径）
 * */
exports.gen = async (tplName, ...sets )=> {
    return new Promise(resolve => {

        // 读取模板生成数据
        let src = fs.readFileSync(path.resolve(__dirname,`./${tplName}.dust`), "utf8");
        let tplcfg = tpl.config;
        let old = tplcfg.whitespace;
        tplcfg.whitespace = true;
        let templateNm = `${tplName}-generator`;
        let compiled = tpl.compile(src, templateNm);
        tplcfg.whitespace = old;
        tpl.loadSource(compiled);

        //write to outputs
        Promise.all(sets.map( st => {
            return render(templateNm, st.data, st.outfile);
        })).then(()=> {
            resolve();
        })
    })
}

function render(templateNm, data, outfile) {
    return new Promise(resolve => {
        tpl.render(templateNm, data, (err, out) => {
            if (err) {
                out = err.toString();
            }

            // 去除多余的空行
            if (exports.trimWrap) {
                console.log('去除多余的空行')
                out = out.replace(/(\r\n){2,}/g, '\r\n')
            }

            //create outdir
            let outDir = path.dirname(outfile);
            mkdirp.sync(outDir);
            //write to outfile
            fs.appendFileSync(outfile, out, {flag: "w"});

            resolve();
        })
    })
}