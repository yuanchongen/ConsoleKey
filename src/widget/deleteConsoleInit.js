const vscode = require('vscode');
const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse");
const recast = require("recast");
const fileList = ['js']
// const logRegex = /console.(log|debug|info|warn|error|assert|dir|dirxml|trace|group|groupEnd|time|timeEnd|profile|profileEnd|count)\((.*)\);?/g;
const logRegex = /(console.(log|debug|info|warn|error|assert|dir|dirxml|trace|group|groupEnd|time|timeEnd|profile|profileEnd|count)\((.*)\)| log\((.*)\));?/g;

// ---------- vscode API -----------

// 入口
function deleteConsoleByPage (){
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    // 编辑中的文档
    const document = editor.document;
    // 文本流
    const documentText = editor.document.getText();

    // 获取匹配的坐标信息 数组
    const Ranges = getAllLogRanges(document, documentText);
    
    // 用坐标信息删除
    deleteFoundLogRanges(editor, Ranges);
}

/**
 * @returns log 的起止坐标数组
 */
function getAllLogRanges(document, documentText) {
    const Ranges = [];

    try {
        // 1.parse 将代码解析为抽象语法树（AST）
        const ast = recast.parse(documentText)
        console.log(1111);
        recast.visit(ast, {
            visitExpressionStatement: function(path) {
                const node = path.node
                const callee = node.expression.callee;
                if(callee && ((callee.object && callee.object.name === 'console') || (callee.name === 'log'))){
                    const _location_ = node.expression.loc 
                    // AST 解析出来的行数 从 1 开始  vscode 处理的行数从 0 开始
                    const start = new vscode.Position(_location_.start.line - 1, _location_.start.column)
                    const end = new vscode.Position(_location_.end.line - 1, _location_.end.column)
                    const endNext = new vscode.Position(_location_.end.line - 1, _location_.end.column + 1)
                    const nextRange = creatRange(end, endNext)
                    let matchRange = null;
                    if(document.getText(nextRange) === ';'){
                        matchRange = creatRange(start, endNext)
                    } else {
                        matchRange = creatRange(start, end)
                    }
                    if (!matchRange.isEmpty)
                        Ranges.push(matchRange);
                    }
                return false
            }
        })
        
    } catch (err) {
        console.log('-警告-AST解析失败', err);
        let match;
        while (match = logRegex.exec(documentText)) {
            const matchRange = creatRange(document.positionAt(match.index), document.positionAt(match.index + match[0].length))
            if (!matchRange.isEmpty) Ranges.push(matchRange);
        }
    }

    console.log('Ranges', Ranges);
    return Ranges;
}

function creatRange(start, end){
    const range =
        new vscode.Range(
            start,
            end
        );
    return range
}

// 按坐标删除
function deleteFoundLogRanges(editor, ranges) {
    editor.edit((editBuilder) => {
		ranges.forEach((range, index) => {
			editBuilder.replace(range, '');
		})
	}).then(() => {
		vscode.window.showInformationMessage(`${ranges.length} console.logs deleted`)
	})
}

// ---------- fs 直接改写 -----------

function deleteConsoleByExplorer (uri) {
    console.log('uri', uri);
    const url = uri.path
    const stat = fs.lstatSync(url)
    if(stat.isFile()){
        deleteByFile(url)
    } else {
        dirTraverse(url)
    }
    console.log('isDirectory', stat.isDirectory());
}

function dirTraverse(dirUrl){
    const files = fs.readdirSync(dirUrl)
    for (const item of files) {
        const fullpath = path.join(dirUrl, item);
        const stat = fs.lstatSync(fullpath)
        if (stat.isFile()) {
            deleteByFile(fullpath)
        } else {
            dirTraverse(fullpath)
        }
    }
}

function deleteByFile(url){
    const fileSuffix = url.split('.').pop().toLowerCase();
    if(~fileList.indexOf(fileSuffix)){
        const filestr = fs.readFileSync(url, {encoding: 'utf8'})
        const newFilestr = filestr.replace(logRegex, '')
        fs.writeFileSync(url, newFilestr)
    }
}

module.exports = function deleteConsoleInit(context) {
    // 注册命令
    const delete_all = vscode.commands.registerCommand('console-key.deleteAllConsole', deleteConsoleByPage)
    const delete_by_explorer = vscode.commands.registerCommand('console-key.deleteConsoleByExplorer', deleteConsoleByExplorer)
    // 注入命令
    context.subscriptions.push(delete_all)
    context.subscriptions.push(delete_by_explorer)
}