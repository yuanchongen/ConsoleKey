const vscode = require('vscode')

const addConsole = (fn) => {
    // vscode.commands.executeCommand('cursorWordLeftSelect')
    const editor = vscode.window.activeTextEditor
    // editor undefind 表示没有打开的文件
    if(!editor) return;
    const textArray = []
    // 对象 包含 选中相关的位置信息  比如 start: { line, character }
    const Ranges = editor.selections
    Ranges.forEach((selection) => {
        const text = editor.document.getText(selection)
        let insertText = 'console.log();'
        if (text) {
            insertText = fn(text)
        }
        textArray.push(insertText)
    })


    vscode.commands.executeCommand('editor.action.insertLineAfter')
    .then(()=> {
        const editor = vscode.window.activeTextEditor;
        const Ranges = editor.selections;
        const positionList = []
        Ranges.forEach((range, index) => {
            const position = new vscode.Position(range.start.line, range.end.character);
            positionList.push(position)
        })
        editor.edit((editBuilder) => {
            positionList.forEach((position, index) => {
                editBuilder.insert(position, textArray[index]);
            })
        });
    })

    // Display a message box to the user
    // vscode.window.showInformationMessage('Hello World from Console Key!')
}

const addConsoleOne = (editor, selection, insertText) => {
    const position = new vscode.Position(selection.start.line, selection.end.character);
    editor.edit((editBuilder) => {
        editBuilder.insert(position, insertText);
    });
}

const addConsoleNormal = () => {
    addConsole((text) => {
        // return `console.log('${text.replace(/'/g,'"')} : ', ${text});`
        return textFilter(text, true)

    })
}

const addConsoleInfo = () => {
    addConsole((text) => {
        // return `console.log('%c${text.replace(/'/g,'"')} : ', 'color:#53DCFB', ${text});`
        return textFilter(text)
    })
}

const textFilter = (text, isNormal) => {
    let result;
    const keyObj = {
        prefix: 'consoleKey.prefix',
        suffix: 'consoleKey.suffix',
        fixStyle: 'consoleKey.fixStyle'
    }
    for (const key in keyObj) {
        keyObj[key] = vscode.workspace.getConfiguration().get(keyObj[key])
    }
    if(isNormal){
        result = `console.log('${keyObj.suffix}${text.replace(/'/g,'"')} : ', ${text}, '${keyObj.prefix}');`
    } else {
        result = `console.log('%c${keyObj.suffix}${text.replace(/'/g,'"')} : ', '${keyObj.fixStyle}', ${text}, '%c${keyObj.prefix}');`
    }
    return result
}

module.exports = function addConsoleInit(context) {
    const disposable_one = vscode.commands.registerCommand('console-key.addConsoleNormal', addConsoleNormal)
    const disposable_info = vscode.commands.registerCommand('console-key.addConsoleInfo', addConsoleInfo)

    context.subscriptions.push(disposable_one)
    context.subscriptions.push(disposable_info)
}