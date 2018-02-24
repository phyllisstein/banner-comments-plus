'use strict';
import * as vscode from 'vscode';
import * as figlet from 'figlet'; 
import * as fs from 'fs';
import * as path from 'path';
import * as commentJson from 'comment-json';
import * as async from 'async';

// String for accessing settings in getConfiguration
const BCP_CONFIG_NS:string = "banner-comments-plus"
var BCP_FONTS_DIR:string;
const BCP_ADDED_FONTS:string[] = [];
const USER_ADDED_FONTS:string[] = [];

const oldFontsSync:Function = figlet.fontsSync;
const oldLoadFontSync:Function = figlet.loadFontSync
figlet.fontsSync = bcpFontsSync;
figlet.loadFontSync = bcpLoadFontSync;


/*
// ███████ ██   ██ ████████ ███    ██ ███████
// ██       ██ ██     ██    ████   ██ ██
// █████     ███      ██    ██ ██  ██ ███████
// ██       ██ ██     ██    ██  ██ ██      ██
// ███████ ██   ██    ██    ██   ████ ███████
*/
export function deactivate() { }
export function activate (context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand("banner-comments-plus.Apply", apply),
        vscode.commands.registerCommand("banner-comments-plus.ApplyFromList", applyFromList),
        vscode.commands.registerCommand("banner-comments-plus.ApplyFromFavorites", applyFavorite),
        vscode.commands.registerCommand("banner-comments-plus.ApplyFromConfig", applyFromConfig),
        vscode.commands.registerCommand("banner-comments-plus.SetDefaultFont", setDefaultFont),
        vscode.commands.registerCommand("banner-comments-plus.SetDefaultFontFromFavorites", setDefaultFontFromFavorites),
        vscode.commands.registerCommand("banner-comments-plus.AddFontToFavorites", addFontToFavorites),
        vscode.commands.registerCommand("banner-comments-plus.AddCurrentFontToFavorites", addCurrentFontToFavorites),
        vscode.commands.registerCommand("banner-comments-plus.RemoveFontFromFavorites", removeFromFavorites),
        vscode.commands.registerCommand("banner-comments-plus.AddCustomFont", addCustomFont),
        vscode.commands.registerCommand("banner-comments-plus.RemoveCustomFont", removeCustomFont),
        vscode.commands.registerCommand("banner-comments-plus.AddNewConfig", addNewConfig)
    );
    BCP_FONTS_DIR = context.extensionPath + "/fonts/";
    loadCustomFonts ()
}

/*
//  █████  ██████  ██
// ██   ██ ██   ██ ██
// ███████ ██████  ██
// ██   ██ ██      ██
// ██   ██ ██      ██
*/
/* apply using defaults in settings */
function apply () {
    const editor:vscode.TextEditor = vscode.window.activeTextEditor;
    var config = getDefaultConfig(editor.document.languageId);
    applyToEditor(editor, config);
}
/* apply default config after picking font from full list */
function applyFromList () {
    vscode.window.showQuickPick(quickPickFontList()).then(
        (_selectedPickerItem:vscode.QuickPickItem) => {
            if (!_selectedPickerItem) return;
            const editor:vscode.TextEditor = vscode.window.activeTextEditor;
            var config = getDefaultConfig(editor.document.languageId);
            config.figletConfig.font = _selectedPickerItem.label;
            applyToEditor(editor, config);
        }
    );
}
/* apply after picking font from favorites */
function applyFavorite () {
    vscode.window.showQuickPick(quickPickFavoritesList()).then(
        (_selectedPickerItem:vscode.QuickPickItem) => {
            if (!_selectedPickerItem) return;
            const editor:vscode.TextEditor = vscode.window.activeTextEditor;
            var config = getDefaultConfig(editor.document.languageId);
            config.figletConfig.font = _selectedPickerItem.label;
            applyToEditor(editor, config);
        }
    );
}
/* apply after picking config from settings or apply using shortcut with geddski.macros*/
function applyFromConfig (name:string) {
    const editor:vscode.TextEditor = vscode.window.activeTextEditor;
    var bcpConfig = vscode.workspace.getConfiguration(BCP_CONFIG_NS);
    let configs:object = bcpConfig.get("configs");
    if (name) {
        let config = configs[name];
        if(config) {
            config.languageId = editor.document.languageId;
            applyToEditor(editor, formatConfigFromSettings(config));
        } else {
            vscode.window.showInformationMessage("BannerComments+: no config found with name '" + name + "'");
        }
        return;
    }
    let descriptionKeys:string[] = bcpConfig.get("configDescriptionKeys");
    var items:vscode.QuickPickItem[] = []
    for (let key in configs) {
        let curConfig:any = configs[key];
        let description:string = "font:" + configs[key].font;
        if (!!descriptionKeys && descriptionKeys.length) {
            description = ""
            for (let decsKey of descriptionKeys) {
                description += decsKey + ": " + curConfig[decsKey] + " | ";
            }
        }
        items.push({ label: key, description: description });
    }
    vscode.window.showQuickPick(items).then(
        (_selectedPickerItem:vscode.QuickPickItem) => {
            if (!_selectedPickerItem) return;
            var config = configs[_selectedPickerItem.label]
            config.languageId = editor.document.languageId;
            applyToEditor(editor, formatConfigFromSettings(config))
        }
    );
}
/* change default font */
function setDefaultFont() {
    vscode.window.showQuickPick(quickPickFontList()).then(
        (_selectedPickerItem:vscode.QuickPickItem) => {
            if (!_selectedPickerItem) return;
            let bcpConfig:any = vscode.workspace.getConfiguration(BCP_CONFIG_NS);
            bcpConfig.update('font', _selectedPickerItem.label, true);
        }
    );
}
/* change default font picking from favorites list */
function setDefaultFontFromFavorites () {
    vscode.window.showQuickPick(quickPickFavoritesList()).then(
        (_selectedPickerItem:vscode.QuickPickItem) => {
            if (!_selectedPickerItem) return;
            let fontToSetName:string = _selectedPickerItem.label;
            vscode.workspace.getConfiguration(BCP_CONFIG_NS).update('font', fontToSetName, true);
        }
    );
}
/* add a font to favorites list */
function addFontToFavorites () {
    vscode.window.showQuickPick(quickPickFontList()).then(
        (_selectedPickerItem:vscode.QuickPickItem) => {
            if (!_selectedPickerItem) return;
            let bcpConfig:any = vscode.workspace.getConfiguration(BCP_CONFIG_NS);
            let favoriteFonts:string[] = bcpConfig.get("favorites");
            let fontToAddName:string = _selectedPickerItem.label;
            if (!favoriteFonts.includes(fontToAddName)) {
                favoriteFonts.push(fontToAddName);
                bcpConfig.update('favorites', favoriteFonts, true);
            } else {
                vscode.window.showInformationMessage("BetterComments+: Chosen font '"+fontToAddName+"' already in favorites.");
            }
        }
    );
}
/* add current default font to favorites list */
function addCurrentFontToFavorites () {
    let bcpConfig:any = vscode.workspace.getConfiguration(BCP_CONFIG_NS);
    let currentFont:string = bcpConfig.get("font");
    let favoriteFonts:string[] = bcpConfig.get("favorites");
    if (!favoriteFonts.includes(currentFont)) {
        favoriteFonts.push(currentFont);
        bcpConfig.update('favorites', favoriteFonts, true);
    } else {
        vscode.window.showInformationMessage("BetterComments+: Current font '"+currentFont+"' is already in favorites.");
    }
}
/* removed font from favorites list */
function removeFromFavorites () {
    let bcpConfig:any = vscode.workspace.getConfiguration(BCP_CONFIG_NS);
    let favoriteFonts:string[] = bcpConfig.get("favorites");
    if (!favoriteFonts.length) {
        vscode.window.showInformationMessage("BannerComments+: No fonts in favorites list");
        return;
    }
    vscode.window.showQuickPick(quickPickFavoritesList()).then(
        (_selectedPickerItem:vscode.QuickPickItem) => {
            if (!_selectedPickerItem) return;
            let fontToRemoveName:string = _selectedPickerItem.label;
            let fontToRemoveIndex:number = favoriteFonts.indexOf(fontToRemoveName);
            favoriteFonts.splice(fontToRemoveIndex, 1);
            bcpConfig.update('favorites', favoriteFonts, true);
        }
    );
}
/* add font to custom list */
function addCustomFont() {
    let opts = {placeHolder: "file path to .flf font"}
    vscode.window.showInputBox(opts).then(
        (_path) => {
            if (!_path || !_path.length) return;
            // check if path actually leads to .flf
            if (!_path.indexOf(".flf")) {
                vscode.window.showErrorMessage("BannerComments+: Provided file path does not contain '.flf'");
                return;
            }
            if (_path[0] === '~') {
                _path = path.join(process.env.HOME, _path.slice(1));
            }
            if (!fs.existsSync(_path)) {
                vscode.window.showErrorMessage("BannerComments+: Given file does not exist" + _path);
                return;
            } else {
                // add font to config
                let bcpConfig = vscode.workspace.getConfiguration(BCP_CONFIG_NS);
                let customFonts:string[] = bcpConfig.get("customFonts");
                if (customFonts.includes(_path)) {
                    vscode.window.showInformationMessage("BannerComments+: Custom font already exists");
                    return;
                }
                customFonts.push(_path);
                bcpConfig.update("customFonts", customFonts, true)
                // load font into figlet
                loadCustomFonts();
            }
        }
    )
}
/* remove font from custom list */
function removeCustomFont() {
    let bcpConfig:any = vscode.workspace.getConfiguration(BCP_CONFIG_NS);
    let customFonts:string[] = bcpConfig.get("customFonts");
    if (!customFonts.length) {
        vscode.window.showInformationMessage("BannerComments+: No custom fonts saved");
        return;
    }
    vscode.window.showQuickPick(quickPickCustomList()).then(
        (_selectedPickerItem:vscode.QuickPickItem) => {
            if (!_selectedPickerItem) return;
            let fontToRemoveName:string = _selectedPickerItem.label;
            let fontToRemoveIndex:number = customFonts.indexOf(fontToRemoveName);
            customFonts.splice(fontToRemoveIndex, 1);
            bcpConfig.update('customFonts', customFonts, true);
        }
    );
}
function addNewConfig() {
    generateNewConfig()
}


/*
// ██       ██████   ██████  ██  ██████
// ██      ██    ██ ██       ██ ██
// ██      ██    ██ ██   ███ ██ ██
// ██      ██    ██ ██    ██ ██ ██
// ███████  ██████   ██████  ██  ██████
*/
/* given an editor and config, make a banner! */
function applyToEditor (editor:vscode.TextEditor, config) {
    return editor.edit(
        (builder:vscode.TextEditorEdit) => {
            editor.selections.forEach(
                _selection => applyToDocumentSelection (editor.document, builder, _selection, config)
            );
        }
    );
}
/* replace selection or line using config */
function applyToDocumentSelection (document:vscode.TextDocument, builder:vscode.TextEditorEdit, selection:vscode.Selection, config) {
    var text:string
    if (selection.active.character == selection.anchor.character) {
        var selectionIsLine:vscode.TextLine = document.lineAt(selection.active);
        text = document.getText(selectionIsLine.range);
    } else {
        text = document.getText(selection);
    }
    var bannerText = generateBannerComment(text, config);
    if (selectionIsLine) {
        builder.delete(selectionIsLine.range);
        builder.insert(selectionIsLine.range.start, bannerText)
    } else {
        builder.replace(selection, bannerText);
    }
}
/* generate the banner text given the configs */
function generateBannerComment (inputText:string, config:any) {
    var err:Error;
    var bannerText:string = "";
    var commentConfig = config.commentConfig
    var options = config.options
    try {
        let useBlockComment = false;
        let useLineComment = false;
        let linePrefix:string = ""
        if (commentConfig) {
            switch (options.commentStyle) {
                case "block": // place blockComment around whole thing ONLY but if not block, use line
                    if      (commentConfig.blockComment) useBlockComment = true
                    else if (commentConfig.lineComment ) useLineComment  = true
                    break;
                case "line" : // only use lineComment on each line but if no line, use block
                    if      (commentConfig.lineComment ) useLineComment  = true
                    else if (commentConfig.blockComment) useBlockComment = true
                    break;
                case "both" : // place both styles
                    useBlockComment = commentConfig.blockComment || false;
                    useLineComment  = commentConfig.lineComment  || false;
                    break;
            }
        }
        if (useLineComment) linePrefix += commentConfig.lineComment;
        linePrefix += options.perLinePrefix;
        // proccess now
        if (useBlockComment) bannerText += commentConfig.blockComment[0] + "\n";
        var figletText:string = "";
        figletText += options.prefix + "\n";
        figletText += figlet.textSync(inputText, config.figletConfig);
        figletText += "\n" + options.suffix;
        for (let _line of figletText.split("\n")) {
            if (options.trimEmptyLines && _line.replace(/^\s*$/,"").length == 0) continue;
            if (options.trimTrailingWhitespace) _line = _line.replace(/\s*$/,"");
			bannerText += linePrefix + _line + "\n";
        }
        if (useBlockComment) bannerText += commentConfig.blockComment[1];
    } catch (replaceErr) {
		err = replaceErr;
	} finally {
        if (err) {
        vscode.window.showErrorMessage(err.message);
        } else {
            return bannerText;
        }
    }
}





/*
// ██    ██ ████████ ██ ██      ███████
// ██    ██    ██    ██ ██      ██
// ██    ██    ██    ██ ██      ███████
// ██    ██    ██    ██ ██           ██
//  ██████     ██    ██ ███████ ███████
*/
function formatConfigFromSettings(config) {
    var bcpConfig = vscode.workspace.getConfiguration(BCP_CONFIG_NS);
    return {
        figletConfig: {
            font:                    (config.font                       || bcpConfig.get("font")),
            horizontalLayout:        (config.horizontalLayout           || bcpConfig.get("horizontalLayout")),
            verticalLayout:          (config.verticalLayout             || bcpConfig.get("verticalLayout"))
        },
        options: {
            trimTrailingWhitespace: (config.trimTrailingWhitespace    || bcpConfig.get("trimTrailingWhitespace")),
            trimEmptyLines:          (config.trimEmptyLines             || bcpConfig.get("trimEmptyLines")),
            prefix:                  (config.prefix                     || bcpConfig.get("prefix")),
            suffix:                  (config.suffix                     || bcpConfig.get("suffix")) ,
            perLinePrefix:           (config.perLinePrefix              || bcpConfig.get("perLinePrefix")),
            commentStyle:            (config.commentStyle               || bcpConfig.get("commentStyle"))
        },
        commentConfig:               getCommentConfig(config.languageId),
    }
}

function getDefaultConfig(languageId) {
    var bcpConfig = vscode.workspace.getConfiguration(BCP_CONFIG_NS);
    return {
        figletConfig: {
            font:                   bcpConfig.get('font'),
            horizontalLayout:       bcpConfig.get('horizontalLayout'),
            verticalLayout:         bcpConfig.get('verticalLayout')
        },
        options: {
            trimTrailingWhitespace: bcpConfig.get("trimTrailingWhitespace"),
            trimEmptyLines:         bcpConfig.get("trimEmptyLines"),
            prefix:                 bcpConfig.get("prefix"),
            suffix:                 bcpConfig.get("suffix"),
            perLinePrefix:          bcpConfig.get("perLinePrefix"),
            commentStyle:           bcpConfig.get("commentStyle")
        },
        commentConfig:               getCommentConfig(languageId)
    }
}

function getCommentConfig(languageId:string):any {
    let langConfig:any = getLanguageConfig(languageId);
    if (!langConfig) console.warn("BannerComments+: Language Config Not Found.");
    else {
        if (langConfig instanceof Array) {
            for (let lang of langConfig) {
                if (lang.comments) return lang.comments;
            }
        } else return langConfig.comments;
    }
    return null;
}

function getLanguageConfig(languageId:string):any {
	var langConfig:any = null;
	const excludedLanguagesIds:any[] = ["plaintext"];
	if (!excludedLanguagesIds.includes(languageId)) {
        let langConfigFilepath:string;
        let extsMatchingLang:any[] = [];
		for (const _ext of vscode.extensions.all) {
			if (_ext.packageJSON.contributes &&
				_ext.packageJSON.contributes.languages
			) {
				const packageLangData:any = _ext.packageJSON.contributes.languages.find(
					_packageLangData => (_packageLangData.id === languageId)
				);
				if (!!packageLangData) {
					langConfigFilepath = path.join(
						_ext.extensionPath,
						packageLangData.configuration
                    );
                    extsMatchingLang.push(langConfigFilepath);
				}
			}
        }
        // if many definitions
        if (extsMatchingLang.length > 1) {
            let langConfigs:any[] = [];
            for (let lang of extsMatchingLang){
                if (!!lang && fs.existsSync(lang)) {
                    langConfigs.push(commentJson.parse(
                        fs.readFileSync(lang, "utf8")
                    ));
                }
            }
            return langConfigs;
        }
        // if only one definition
		if (!!langConfigFilepath && fs.existsSync(langConfigFilepath)) {
			/**
			 * unfortunatly, some of vscode's language config contains
			 * comments... ("xml" and "xsl" for example)
			 */
			langConfig = commentJson.parse(
				fs.readFileSync(langConfigFilepath, "utf8")
			);
            return langConfig;
		} else return null;
	}
}






/*
// ███████ ██  ██████  ██      ███████ ████████     ██████  ██    ██ ██████  ███████
// ██      ██ ██       ██      ██         ██        ██   ██ ██    ██ ██   ██ ██
// █████   ██ ██   ███ ██      █████      ██        ██   ██ ██    ██ ██████  ███████
// ██      ██ ██    ██ ██      ██         ██        ██   ██ ██    ██ ██   ██      ██
// ██      ██  ██████  ███████ ███████    ██        ██████   ██████  ██████  ███████
*/
function loadCustomFonts () {
    // add fonts from user
    let customFonts:string[] = vscode.workspace.getConfiguration(BCP_CONFIG_NS).get("customFonts");
    customFonts.forEach(_font => {
        let fontName:string = _font.replace(/\.flf$/,'')
        if (!USER_ADDED_FONTS.includes(fontName)) {
            USER_ADDED_FONTS.push(fontName);
        }
    });
    // add fonts from BCP
    fs.readdirSync(BCP_FONTS_DIR).forEach(function(file) {
        if ( /\.flf$/.test(file) ) {
            let fontName:string = file.replace(/\.flf$/,'')
            if (!BCP_ADDED_FONTS.includes(fontName)) {
                BCP_ADDED_FONTS.push(fontName);
            }
        }
    });
}
    
function bcpFontsSync () {
    return oldFontsSync().concat(BCP_ADDED_FONTS, USER_ADDED_FONTS);
}

function bcpLoadFontSync (name) {
    var fontName;
    if (BCP_ADDED_FONTS.includes(name)) fontName = BCP_FONTS_DIR + name + ".flf";
    if (USER_ADDED_FONTS.includes(name)) fontName = name + ".flf"
    if (fontName) {
        var fontData = fs.readFileSync(fontName,  {encoding: 'utf-8'});
        fontData = fontData + '';
        return figlet.parseFont(name, fontData);
    } else return oldLoadFontSync(name);
}



/*
//  ██████  ██    ██ ██  ██████ ██   ██ ██████  ██  ██████ ██   ██
// ██    ██ ██    ██ ██ ██      ██  ██  ██   ██ ██ ██      ██  ██
// ██    ██ ██    ██ ██ ██      █████   ██████  ██ ██      █████
// ██ ▄▄ ██ ██    ██ ██ ██      ██  ██  ██      ██ ██      ██  ██
//  ██████   ██████  ██  ██████ ██   ██ ██      ██  ██████ ██   ██
//     ▀▀
*/
function quickPickFontList () {
    var availableFigletfonts:string[] = figlet.fontsSync();
    var items:vscode.QuickPickItem[] = availableFigletfonts.map(
        (figletFont:string) => {
            return { label: figletFont, description: "Use the " + figletFont + " font" };
        }
    );
    return items || [];
}
function quickPickFavoritesList() {
    let favoriteFonts:string[] = vscode.workspace.getConfiguration(BCP_CONFIG_NS).get("favorites");
    var items:vscode.QuickPickItem[] = favoriteFonts.map(
        (_favoriteFont:string) => {
            return { label: _favoriteFont, description: "Use the " + _favoriteFont + " font" };
        }
    );
    return items || [];
}
function quickPickLayoutChoices() {
    return [
        {label: 'default',             description: ""},
        {label: 'full',                description: ""},
        {label: 'fitted',              description: ""},
        {label: 'controlled smushing', description: ""},
        {label: 'universal smushing',  description: ""}
    ];
}
function quickPickCommentStyleChoices() {
    return [
        {label:"Block", description:"prefer block style comments"},
        {label:"Line", description:"prefer line style comments"},
        {label:"Both", description:"always render both style comments"}
    ]
}
function quickPickBooleanChoices() {
    return [
        {label:"True", description:""},
        {label:"False", description:""}
    ]
}
function quickPickCustomList() {
    let customFonts:string[] = vscode.workspace.getConfiguration(BCP_CONFIG_NS).get("customFonts");
    var items:vscode.QuickPickItem[] = customFonts.map(
        (_customFont:string) => {
            return { label: _customFont, description: "" };
        }
    );
    return items || [];
}
function addDefaultPick(otherList) {
    var def = [ {label:"Default Value", description:""} ]
    if (otherList) return def.concat(otherList);
    else return def 
}

function generateNewConfig() {
    let bcpConfig = vscode.workspace.getConfiguration(BCP_CONFIG_NS);
    let defaultConfig = getDefaultConfig(null);
    let configs:object[] = bcpConfig.get("configs")
    let config:any = {}
    let name = "";
    let saveDefaults:boolean = false;
    vscode.window.showQuickPick(quickPickBooleanChoices(), {placeHolder: "Store default values in config?"}).then(_input => {
        saveDefaults =  _input.label == "True" ? true : false;
        // name
        vscode.window.showInputBox({prompt: "Name for Config"}).then(_input => {
            if (!_input.length) {
                vscode.window.showErrorMessage("You must provide a name");
                return;
            }
            for (let key in configs) {
                if (key == _input) {
                    vscode.window.showErrorMessage("Config with name '" + _input + "' already exists");
                    return;
                }
            }
            name = _input;
            // font
            vscode.window.showQuickPick(addDefaultPick(quickPickFontList()), {placeHolder: "font"}).then(_input => {
                if (_input.label == "Default Value") {
                    if (saveDefaults) config.font = defaultConfig.figletConfig.font;
                } else config.font = _input.label;
                // horizontalLayout    
                vscode.window.showQuickPick(addDefaultPick(quickPickLayoutChoices()), {placeHolder: "horizontalLayout"}).then(_input => {
                    if (_input.label == "Default Value") {
                        if (saveDefaults) config.horizontalLayout = defaultConfig.figletConfig.horizontalLayout;
                    } else config.horizontalLayout = _input.label;
                    // verticalLayout
                    vscode.window.showQuickPick(addDefaultPick(quickPickLayoutChoices()), {placeHolder: "verticalLayout"}).then(_input => {
                        if (_input.label == "Default Value") {
                            if (saveDefaults) config.verticalLayout = defaultConfig.figletConfig.verticalLayout;
                        } else config.verticalLayout = _input.label;
                        // trimTrailingWhitespace
                        vscode.window.showQuickPick(addDefaultPick(quickPickBooleanChoices()), {placeHolder: "trimTrailingWhitespace"}).then(_input => {
                            if (_input.label == "Default Value") {
                                if (saveDefaults) config.trimTrailingWhitespace = defaultConfig.options.trimTrailingWhitespace;
                            } else config.trimTrailingWhitespace = _input.label == "True" ? true : false;
                            // trimEmptyLines
                            vscode.window.showQuickPick(addDefaultPick(quickPickBooleanChoices()), {placeHolder: "trimEmptyLines"}).then(_input => {
                                if (_input.label == "Default Value") { 
                                    if (saveDefaults) config.trimEmptyLines = defaultConfig.options.trimEmptyLines;
                                } else config.trimEmptyLines = _input.label == "True" ? true : false;
                                // prefix
                                vscode.window.showInputBox({prompt: "Prefix - '' for empty, Esc for Default Value"}).then(_input => {
                                    if (!_input) { 
                                        if (saveDefaults) config.prefix = defaultConfig.options.prefix;
                                    } else {
                                        if (_input == "''") config.prefix = "";
                                        else config.prefix = _input;
                                    }
                                    // suffix
                                    vscode.window.showInputBox({prompt: "Suffix - '' for empty, Esc for Default Value"}).then(_input => {
                                        if (!_input) {
                                            if (saveDefaults) config.suffix = defaultConfig.options.suffix;
                                        } else {
                                            if (_input == "''") config.suffix = "";
                                            else config.suffix = _input;
                                        }
                                        // perLinePrefix
                                        vscode.window.showInputBox({prompt: "perLinePrefix - '' for empty, Esc for Default Value"}).then(_input => {
                                            if (!_input) {
                                                if (saveDefaults) config.perLinePrefix = defaultConfig.options.perLinePrefix;
                                            } else {
                                                if (_input == "''") config.perLinePrefix = "";
                                                else config.perLinePrefix = _input;
                                            }
                                            // commentStyle
                                            vscode.window.showQuickPick(addDefaultPick(quickPickCommentStyleChoices()), {placeHolder: "commentStyle"}).then(_input => {
                                                if (_input.label == "Default Value") {
                                                    if (saveDefaults) config.commentStyle = defaultConfig.options.commentStyle;
                                                } else config.commentStyle = _input.label;
                                                // finish and save
                                                configs[name] = config;
                                                vscode.workspace.getConfiguration(BCP_CONFIG_NS).update("configs", configs, true);
                                            }); // commentStyle
                                        }); // perLinePrefix
                                    }); // suffix
                                }); // prefix
                            }); // trimEmptyLines
                        }); // trimTrailingWhitespace
                    }); // verticalLayout
                }); // horizontalLayout
            }); // font
        }); // name
    }) // saveDefaults
}