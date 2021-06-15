const CONFIG = {
    layerSetsType: {
        indexPage: "封面",
        endPage: "封底",
        mainPage: "正文",
        formatPpage: "版式",
    },
}
/** 输出基础路径 */
const OUT_PUT_BASE_DIR_NAME = "cartoonCard";
var mainPageLys, indexPageLys, endPageLys, formatPpageLys;

if (confirm("export ?")) {
    main();
}

function main() {
    app.bringToFront();
    if (!documents.length) {
        alert("ps没有打开文档");
        return;
    }

    // var hisIndex = app.activeDocument.historyStates.length - 2;
    // hisIndex > 0 ? hisIndex : 0;
    exportTemplate(app.activeDocument);
    // app.activeDocument.activeHistoryState = app.activeDocument.historyStates[hisIndex];

}

// 导出当前活动文档
function exportTemplate(document) {
    var allLys = app.activeDocument.layerSets; //所有图层组

    for (var i = 0; i < allLys.length; i++) {
        switch (allLys[i].name) {
            case CONFIG.layerSetsType.indexPage:
                indexPageLys = allLys[i];
                indexPageLys && (indexPageLys.visible = false);
                break;
            case CONFIG.layerSetsType.mainPage:
                mainPageLys = allLys[i];
                mainPageLys && (mainPageLys.visible = false);
                break;
            case CONFIG.layerSetsType.endPage:
                endPageLys = allLys[i];
                endPageLys && (endPageLys.visible = false);
                break;
            case CONFIG.layerSetsType.formatPpage:
                formatPpageLys = allLys[i];
                formatPpageLys && (formatPpageLys.visible = false);
                break;
            default:
                break;
        }
    }

    if (confirm("导出封面 ?")) {
        exportPage(indexPageLys, "cover");
    }
    if (confirm("导出正文 ?")) {
        exportPage(mainPageLys, "content");
    }
    if (confirm("导出版式 ?")) {
        exportPage(formatPpageLys, "format");
    }
    if (confirm("导出封底 ?")) {
        exportPage(endPageLys, "backcover");
    }
}


function exportPage(mainPageLys, typeName) {
    // $.writeln("正文组", mainPageLys);
    if (!mainPageLys) {
        return;
    }
    mainPageLys.visible = true;
    var pageLys = mainPageLys.layerSets;
    var curPageLys;
    var curMaskLys;
    var curLy;

    if (pageLys.length == 0) {
        alert("每页需要一个单独的图层组！");
        return;
    }
    if (typeName == "content" || typeName == "format") {
        hideLayer(pageLys);

        for (var pageIndex = 0; pageIndex < pageLys.length; pageIndex++) {
            curPageLys = pageLys[pageIndex];

            showLayer(curPageLys);
            exportPageDetail(curPageLys, typeName, pageIndex);
            hideLayer(curPageLys);

            curPageLys.visible = true;

            var keyMap = {};
            var repeatMap = {};
            var textIndex = 0;

            maskBlockIndex = 1;
            maskBlockJson = "{";

            for (var maskIndex = 0; maskIndex < curPageLys.layerSets.length; maskIndex++) {

                var curMaskLys = curPageLys.layerSets[maskIndex];

                //去除蒙版
                clearMask(curMaskLys);
                hideLayer(curMaskLys)
                curMaskLys.visible = true;

                exportOneMask(curMaskLys, keyMap, repeatMap, textIndex, pageIndex, maskIndex, typeName)
            }

            maskBlockJson += "}";
            var dir = outputDir() + typeName + "_" + (pageIndex + 1) + "/mask";
            exportJson(dir, "rect.json", maskBlockJson)
            exportRepeatJson(repeatMap, pageIndex, typeName);
        }
    } else {
        hideLayer(pageLys);
        for (var pageIndex = 0; pageIndex < pageLys.length; pageIndex++) {
            curPageLys = pageLys[pageIndex];
            showLayer(curPageLys);
            exportPageDetail(curPageLys, typeName, pageIndex);
            hideLayer(curPageLys);
            curPageLys.visible = true;

            var textIndex = 0;
            var keyMap = {};
            var repeatMap = {};
            exportOneCover(curPageLys, textIndex, keyMap, repeatMap, pageIndex, typeName);
            exportRepeatJson(repeatMap, pageIndex, typeName);
        }
    }

    mainPageLys.visible = false;
}

function exportPageDetail(curPageLys, typeName, pageIndex) {
    var dir = outputDir() + typeName + "_" + (pageIndex + 1);
    exportOneLayer(curPageLys, dir, "detail" + ".jpg", true);
}

function exportRepeatJson(repeatMap, pageIndex, typeName) {
    var repeat_jsonStr = "{";
    var copyIndex = 0;
    for (var i in repeatMap) {

        if (repeatMap[i].length > 1) {
            if (copyIndex > 0) {
                repeat_jsonStr = repeat_jsonStr + ",";
            }
            repeat_jsonStr = repeat_jsonStr + "\"copy_" + copyIndex + "\":" + "[";
            var len = repeatMap[i].length;
            for (var j = 0; j < len; j++) {
                if (j < len - 1) {
                    repeat_jsonStr = repeat_jsonStr + "\"" + repeatMap[i][j] + "\"" + ",";
                } else {
                    repeat_jsonStr = repeat_jsonStr + "\"" + repeatMap[i][j] + "\"" + "]";
                }
            }
            copyIndex++;
        }

    }
    repeat_jsonStr += "}";
    var rpj_dir = outputDir() + typeName + "_" + (pageIndex + 1);
    exportJson(rpj_dir, "repeat.json", repeat_jsonStr);
}

function exportOneCover(curPageLys, textIndex, keyMap, repeatMap, pageIndex, typeName) {

    for (var lyIndex = 0; lyIndex < curPageLys.layers.length; lyIndex++) {
        curLy = curPageLys.layers[lyIndex];

        if (curLy.kind != LayerKind.TEXT) {
            if (keyMap[curLy.name] >= 0) {
                keyMap[curLy.name] = keyMap[curLy.name] + 1;
            } else {
                keyMap[curLy.name] = 0;
                repeatMap[curLy.name] = [];
            }
            var repeatName = curLy.name + "#" + keyMap[curLy.name];
            repeatMap[curLy.name].push(repeatName);
        }

        var zIndex = curPageLys.layers.length - lyIndex;

        if (curLy.kind == LayerKind.TEXT) {
            var dir = outputDir() + typeName + "_" + (pageIndex + 1) + "/m1/" + "text_" + textIndex + "#0";
            var rect = getLayerRect(curLy);
            var prop = getTextProp(curLy);
            var jsonStr = "{" + "\"" + "config" + "\"" + ":{" + "\"" + "rect" + "\"" + ":[" + rect + "]";
            jsonStr += ",";
            jsonStr += "\"color\":\"" + curLy.textItem.color.rgb.hexValue + "\"";
            jsonStr += ",";
            // jsonStr += "\"font\":\"" + layer.textItem.font + "\"";
            // jsonStr += ",";
            jsonStr += "\"font\":\"" + prop.font + "\"";
            jsonStr += ",";
            // jsonStr += "\"content\":\"" + base64encode(layer.textItem.contents) + "\"";
            // jsonStr += ",";
            jsonStr += "\"content\":\"" + base64encode(prop.contents) + "\"";
            jsonStr += ",";
            jsonStr += "\"fontSize\":" + Math.round(prop.textSize * 0.9);
            jsonStr += ",";
            jsonStr += "\"lineHeight\":" + prop.leading;
            jsonStr += ",";
            jsonStr += "\"rotate\":" + getActiveLayerRotation(curLy);
            // $.writeln("测试: " + layer.name + ",,,," + jsonStr + ",,,,," + rt);
            jsonStr += ",";
            jsonStr += "\"zIndex\":" + zIndex;
            jsonStr += "}}";
            exportJson(dir, "config.json", jsonStr);
            curLy.visible = false;
            textIndex++;
        } else {
            var dir = outputDir() + typeName + "_" + (pageIndex + 1) + "/m1/" + curLy.name + "#" + keyMap[curLy.name];
            var rect = getLayerRect(curLy);
            var jsonStr = "{" + "\"" + "config" + "\"" + ":{" + "\"" + "rect" + "\"" + ":[" + rect + "]";
            jsonStr += ",";
            jsonStr += "\"zIndex\":" + zIndex;
            jsonStr += "}}";
            exportJson(dir, "config.json", jsonStr)

            // exportOneLayer(curLy, dir, curLy.name + ".png", true);

            exportOneLayer(curLy, dir, "zc.png");
            if (curLy.name.indexOf("background") != -1) {
                scaleExport_bg(dir, "zc.png", dir, "icon.png", 153);
            } else {
                scaleExport(dir, "zc.png", dir, "icon.png", 200);
            }
        }
    }
}


function exportOneMask(curMaskLys, keyMap, repeatMap, textIndex, pageIndex, maskIndex, typeName) {
    for (var lyIndex = 0; lyIndex < curMaskLys.layers.length; lyIndex++) {
        curLy = curMaskLys.layers[lyIndex];

        if (curLy.kind != LayerKind.TEXT) {
            if (keyMap[curLy.name] >= 0) {
                keyMap[curLy.name] = keyMap[curLy.name] + 1;
            } else {
                keyMap[curLy.name] = 0;
                repeatMap[curLy.name] = [];
            }
            var repeatName = "m" + (maskIndex + 1) + "_" + curLy.name + "#" + keyMap[curLy.name];
            repeatMap[curLy.name].push(repeatName);
        }

        var zIndex = curMaskLys.layers.length - lyIndex;
        if (curLy.kind == LayerKind.TEXT) {
            //TODO:
            var dir = outputDir() + typeName + "_" + (pageIndex + 1) + "/m" + (maskIndex + 1) + "/" + "text_" + textIndex + "#0";
            var rect = getLayerRect(curLy);
            var prop = getTextProp(curLy);
            var jsonStr = "{" + "\"" + "config" + "\"" + ":{" + "\"" + "rect" + "\"" + ":[" + rect + "]";
            jsonStr += ",";
            try {
                jsonStr += "\"color\":\"" + curLy.textItem.color.rgb.hexValue + "\"";
            } catch (x_x) {
                jsonStr += "\"color\":\"000000\"";

            }
            jsonStr += ",";
            // jsonStr += "\"font\":\"" + layer.textItem.font + "\"";
            // jsonStr += ",";
            jsonStr += "\"font\":\"" + prop.font + "\"";
            jsonStr += ",";
            // jsonStr += "\"content\":\"" + base64encode(layer.textItem.contents) + "\"";
            // jsonStr += ",";
            jsonStr += "\"content\":\"" + base64encode(prop.contents) + "\"";
            jsonStr += ",";
            jsonStr += "\"fontSize\":" + Math.round(prop.textSize * 0.9);
            jsonStr += ",";
            jsonStr += "\"lineHeight\":" + prop.leading;
            jsonStr += ",";
            jsonStr += "\"rotate\":" + getActiveLayerRotation(curLy);
            // $.writeln("测试: " + layer.name + ",,,," + jsonStr + ",,,,," + rt);
            jsonStr += ",";
            jsonStr += "\"zIndex\":" + zIndex;
            jsonStr += "}}";
            exportJson(dir, "config.json", jsonStr);
            curLy.visible = false;
            textIndex++;
        } else if (curLy.name.indexOf("mask") >= 0) {
            app.activeDocument.activeLayer = curLy;

            var dir = outputDir() + typeName + "_" + (pageIndex + 1) + "/mask";
            var rect = getLayerRect(curLy);

            exportOneLayer(curLy, dir, "white_" + maskBlockIndex + ".png" , true);

            app.doAction("导出选中图", "MLZB.atn");
            exportOneLayer(curLy, dir, "select_" + maskBlockIndex + ".png" , true);
            app.doAction("导出未选中图", "MLZB.atn");
            exportOneLayer(curLy, dir, "unselect_" + maskBlockIndex + ".png" , true);

            app.doAction("描边", "MLZB.atn");

            if (maskBlockIndex > 1) {
                maskBlockJson += ",";
            }

            exportOneLayer(curLy, dir, maskBlockIndex + ".png" , true);

            maskBlockJson = maskBlockJson + "\"" + maskBlockIndex + "\"" + ":{" + "\"" + "rect" + "\"" + ":[" + rect + "]}";
            maskBlockIndex++;
        } else {
            var dir = outputDir() + typeName + "_" + (pageIndex + 1) + "/m" + (maskIndex + 1) + "/" + curLy.name + "#" + keyMap[curLy.name];
            var rect = getLayerRect(curLy);
            var jsonStr = "{" + "\"" + "config" + "\"" + ":{" + "\"" + "rect" + "\"" + ":[" + rect + "]";
            jsonStr += ",";
            jsonStr += "\"zIndex\":" + zIndex;
            jsonStr += "}}";
            exportJson(dir, "config.json", jsonStr)

            // exportOneLayer(curLy, dir, curLy.name + ".png", true);

            exportOneLayer(curLy, dir, "zc.png");
            if (curLy.name.indexOf("background") != -1) {
                scaleExport_bg(dir, "zc.png", dir, "icon.png", 153);
            } else {
                scaleExport(dir, "zc.png", dir, "icon.png", 200);
            }

        }
    }
}


function getTextProp(layer) {
    app.activeDocument.activeLayer = layer;
    var ref = new ActionReference();
    ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    var desc = executeActionGet(ref).getObjectValue(stringIDToTypeID('textKey'));
    var style = desc.getList(stringIDToTypeID('textStyleRange')).getObjectValue(0).getObjectValue(stringIDToTypeID('textStyle'));
    var textSize = style.getDouble(stringIDToTypeID('size'))
    var leading;
    try {
        var autoLeading = style.getDouble(stringIDToTypeID('autoLeading'));
        if (autoLeading) {
            leading = null;
        } else {
            leading = style.getDouble(stringIDToTypeID('leading'));
        }
    } catch (error) {
        leading = null;
    }
    // var color = style.getObjectValue(stringIDToTypeID("color"))
    // $.writeln("测试3")

    var contents = desc.getString(stringIDToTypeID("textKey"));
    // $.writeln("测试5")
    var font = style.getString(stringIDToTypeID('fontName'));
    // var s = desc;
    // var str = ""
    // for (var i = 0; i < s.count; i++) {
    //     str += 'Key ' + i + ' = ' + t2s(s.getKey(i)) + ': ' + s.getType(s.getKey(i)) + ' = ' + getValues(s, i) + '\n';
    // };
    // $.writeln("测试6", str)
    // var contents =  desc.getList(stringIDToTypeID('textStyleRange')).getObjectValue(0).getObjectValue(stringIDToTypeID('textStyle')).getString (stringIDToTypeID('color'));  
    // $.writeln("测试100", contents)
    if (desc.hasKey(stringIDToTypeID('transform'))) {
        var mFactor = desc.getObjectValue(stringIDToTypeID('transform')).getUnitDoubleValue(stringIDToTypeID("yy"));
        textSize = (textSize * mFactor).toFixed(0);
        if (leading == null) {
            leading = textSize * 7 / 4;
        } else {
            leading = (leading * mFactor).toFixed(0);
        }
    } else {
        if (leading == null) {
            leading = textSize * 7 / 4;
        }
    }

    return {
        textSize: textSize,
        leading: leading,
        contents: contents,
        font: font
    };
}

// function t2s(t) { return typeIDToStringID(t) }
// function s2t(t) { return stringIDToTypeID(t) }
// function getValues(desc, keyNum) {
//     var kTypeID = desc.getKey(keyNum);
//      switch (desc.getType(kTypeID)) {
//      case DescValueType.OBJECTTYPE:
//     return (desc.getObjectValue(kTypeID) + "_" + t2s(desc.getObjectType(kTypeID)));
//      break;
//      case DescValueType.LISTTYPE:

//      return desc.getList(kTypeID);
//      break;
//      case DescValueType.REFERENCETYPE:
//      return desc.getReference(kTypeID);
//      break;
//      case DescValueType.BOOLEANTYPE:
//     return desc.getBoolean(kTypeID);
//      break;
//      case DescValueType.STRINGTYPE:
//      return desc.getString(kTypeID);
//      break;
//      case DescValueType.INTEGERTYPE:
//      return desc.getInteger(kTypeID);
//      break;
//      case DescValueType.LARGEINTEGERTYPE:
//      return desc.getLargeInteger(kTypeID);
//      break;
//      case DescValueType.DOUBLETYPE:
//      return desc.getDouble(kTypeID);
//     break;
//      case DescValueType.ALIASTYPE:
//      return desc.getPath(kTypeID);
//      break;
//      case DescValueType.CLASSTYPE:
//      return desc.getClass(kTypeID);
//      break;
//      case DescValueType.UNITDOUBLE:
//      return (desc.getUnitDoubleValue(kTypeID) +"_" + t2s(desc.getUnitDoubleType(kTypeID)));
//      break;
//      case DescValueType.ENUMERATEDTYPE:
//      return (t2s(desc.getEnumerationValue(kTypeID)) +
//      "_" + t2s(desc.getEnumerationType(kTypeID)));
//      break;
//      case DescValueType.RAWTYPE:
//      var tempStr = desc.getData(kTypeID);
//      var rawData = new Array();
//     for (var tempi = 0; tempi < tempStr.length; tempi++) {
//      rawData[tempi] = tempStr.charCodeAt(tempi);
//      }
//     return rawData;
//      break;
//     default:

//      break;
//     };
// } 

function clearMask(lys) {
    for (var lyIndex = 0; lyIndex < lys.layers.length; lyIndex++) {
        curLy = lys.layers[lyIndex];
        if (curLy.grouped) {
            app.activeDocument.activeLayer = curLy;
            app.doAction("去蒙版", "MLZB.atn");
        }
    }
}

/** ------------------------------------------------基础函数------------------------------------------------------- */
function getLayerRect(layer, isLimit) {
    var bounds = layer.bounds + "";
    var list = bounds.split(",");

    var rect = [];
    for (var i = 0; i < list.length; i++) {
        var b = UnitValue(list[i]);
        rect.push(Math.round(b.as("px")))
    }
    if (isLimit) {
        rect[0] = Math.max(rect[0], 0)
        rect[1] = Math.max(rect[1], 0)
        rect[2] = Math.min(rect[2], 787)
        rect[3] = Math.min(rect[3], 1400)
    }
    // $.writeln("layer name  = " , layer.name , "   rect = " , rect)
    // rect[0] = Math.max(rect[0], 0)
    // rect[1] = Math.max(rect[1], 0)
    // rect[2] = Math.min(rect[2], 787)
    // rect[3] = Math.min(rect[3], 1400)
    return rect
}
/** 显示图层下所有的子图层 */
function showLayer(layer) {
    if (layer.length > 0) {
        for (var j = 0; j < layer.length; j++) {
            showLayer(layer[j]);
        }
    } else if (layer.layers && layer.layers.length > 0) {
        if (!layer.visible) {
            layer.visible = true;
        }
        for (var j = 0; j < layer.layers.length; j++) {
            showLayer(layer.layers[j]);
        }
    } else {
        if (!layer.visible) {
            layer.visible = true;
        }
    }
}

function hideLayer(layer) {
    if (layer.length > 0) {
        for (var j = 0; j < layer.length; j++) {
            hideLayer(layer[j]);
        }
    } else if (layer.layers && layer.layers.length > 0) {
        for (var j = 0; j < layer.layers.length; j++) {
            hideLayer(layer.layers[j]);
        }
        layer.visible = false;
    } else {
        layer.visible = false;

    }
}

/** 导出一个元素 */
function scaleExport(inPath, inName, outPath, outName, maxSideLength) {
    app.load(new File(inPath + "/" + inName))
    var width = app.activeDocument.width.as("px");
    var height = app.activeDocument.height.as("px");

    var scale = maxSideLength / Math.max(width, height);
    var uWidth = UnitValue(Math.round(scale * width) + " px");
    var uHeight = UnitValue(Math.round(scale * height) + " px");

    app.activeDocument.resizeImage(uWidth, uHeight);
    exportDocument(outPath, outName);
    app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
}

/** 导出一个元素 */
function scaleExport_bg(inPath, inName, outPath, outName, maxSideLength) {
    app.load(new File(inPath + "/" + inName))
    var width = app.activeDocument.width.as("px");
    var height = app.activeDocument.height.as("px");

    var scale = maxSideLength / width,
        height;
    var uWidth = UnitValue(Math.round(scale * width) + " px");
    var uHeight = UnitValue(Math.round(scale * height) + " px");

    app.activeDocument.resizeImage(uWidth, uHeight);
    exportDocument(outPath, outName);
    app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
}

// /** 导出一个元素 */
// function cropExport(inPath, inName, outPath, outName){
//     app.load(new File(inPath + inName));
//     exportDocument(outPath, outName, true);
//     app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
// }

/** 导出一个图层 */
function exportOneLayer(layer, outputDir, strOutputFile, hasRect) {
    layer.visible = true;

    // var rect = getLayerRect(layer);
    // var offsetX = -rect[0];
    // var offsetY = -rect[1];
    layer.translate(0, 0);
    if (outputDir) {
        exportDocument(outputDir, strOutputFile, hasRect ? getLayerRect(layer, hasRect) : getLayerRect(layer));
    } else {
        exportDocument(outputDir(), strOutputFile, hasRect ? getLayerRect(layer, hasRect) : getLayerRect(layer));
    }

    layer.visible = false;
}

/** 导出当前显示的图像到png文件 */
function exportDocument(strOutputPath, strOutputFile, rect) {
    //定义一个变量[document]，用来表示Photoshop当前的活动文档。
    var doc = app.activeDocument;
    // 创建输出路径
    var outputFolder = new Folder(strOutputPath);
    if (!outputFolder.exists) {
        outputFolder.create()
    }
    //定义一个变量[fileOut]，用来指定文件保存的路径。

    var pngFile = new File(strOutputPath + "/" + strOutputFile);
    //定义一个变量[options]，用来指定图片保存的格式为PNG。
    var isPng = strOutputFile.split(".")[1] == "png";
    var options = isPng ? PNGSaveOptions : JPEGSaveOptions;
    if (isPng) {
        options.compression = 6;
    } else {
        options.quality = 6;
    }

    //定义一个变量[asCopy]，用来指定图片以副本的方式保存。
    var asCopy = true;

    //定义一个变量[extensionType]，用来指定图片名称的后缀为小写的.png。
    var extensionType = Extension.LOWERCASE;

    if (rect) {
        doc.crop(rect);
        // doc.trim(TrimType.TRANSPARENT, true, true, true, true);
    }
    doc.saveAs(pngFile, options, asCopy, extensionType);
    if (rect) {
        app.activeDocument.activeHistoryState = app.activeDocument.historyStates[app.activeDocument.historyStates.length - 2];
    }
    pngFile.close();
}
/** 导出当前显示的图像到png文件 */
function exportJson(strOutputPath, strOutputFile, str) {
    // 创建输出路径
    var outputFolder = new Folder(strOutputPath);
    if (!outputFolder.exists) {
        outputFolder.create()
    }
    var f = new File(strOutputPath + "/" + strOutputFile);
    if (f) {
        f.open("w");
        f.write(str);
        f.close();
    }
}

function getActiveLayerRotation(layer) {
    app.activeDocument.activeLayer = layer;
    var ref = new ActionReference();
    ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    var desc = executeActionGet(ref).getObjectValue(stringIDToTypeID('textKey'))
    if (desc.hasKey(stringIDToTypeID('transform'))) {
        desc = desc.getObjectValue(stringIDToTypeID('transform'))
        var yy = desc.getDouble(stringIDToTypeID('yy'));
        var xy = desc.getDouble(stringIDToTypeID('xy'));
        return angleFromMatrix(yy, xy);
    }
    return 0;
}

function angleFromMatrix(yy, xy) {
    var toDegs = 180 / Math.PI;
    return Math.round(Math.atan2(yy, xy) * toDegs - 90);
}

function base64encode(input) {
    var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var _utf8_encode = function(string) {
        // string = string.replace(/\r\n/g, "\n");
        var utftext = "";
        for (var n = 0; n < string.length; n++) {
            var c = string.charCodeAt(n);
            if (c < 128) {
                utftext += String.fromCharCode(c);
            } else if ((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            } else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }

        }
        return utftext;
    };
    var output = "";
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;
    input = _utf8_encode(input);
    while (i < input.length) {
        chr1 = input.charCodeAt(i++);
        chr2 = input.charCodeAt(i++);
        chr3 = input.charCodeAt(i++);
        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        enc4 = chr3 & 63;
        if (isNaN(chr2)) {
            enc3 = enc4 = 64;
        } else if (isNaN(chr3)) {
            enc4 = 64;
        }
        output = output +
            _keyStr.charAt(enc1) + _keyStr.charAt(enc2) +
            _keyStr.charAt(enc3) + _keyStr.charAt(enc4);
    }
    return output;
}


/** ------------------------------------------------------------------------------------------------------------------------ */

/** 返回文件导出目录 */
function outputDir() {
    var strDocumentName = app.activeDocument.name.substr(0, app.activeDocument.name.length - 4);
    return app.activeDocument.path + "/" + strDocumentName + "/" + OUT_PUT_BASE_DIR_NAME + "/";
}


/** ----------------------------------------------------------------------------------------------------------------------- */