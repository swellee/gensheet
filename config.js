module.exports = {
    //注：配的相对路径，是相对于本项目根路径，即‘./’表示package.json所在的目录
    popkey: {
        enable: true,
        inDir:'./sheet/',//也可以配置到具体文件，只处理这一个文件
        outFileC:'../picasso/dev/popup/sheetClient.ts',
        outFileS:'./output/sheetServer.ts',
        tplName: 'sheet_ts', // dust templet file name
        splitC: true, // 是否对客户端表按sheet拆分，每个sheet生成一个js文件 ....  此选项与chunkC只能有一个起作用，若同时为true，则以此项为准
        // chunkC: 500 * 1024, //是否对客户端表按文件尺寸拆分（如果客户端表太大，可以拆分）
        chunkTplNames: ['sheetdeclare','sheetdata'], // declare tpl and data tpl
    },
}