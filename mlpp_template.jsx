#target photoshop

/** ------------------------------------------------基础函数------------------------------------------------------- */
function getLayerRect(layer){
	var bounds = layer.bounds + "";
    var list = bounds.split(",");

    var rect = [];
    for(var i = 0; i < list.length; i++){
        var b = UnitValue(list[i]);
        rect.push(Math.round(b.as("px")))
    }
	rect[0] = Math.max(rect[0], 0)
	rect[1] = Math.max(rect[1], 0)
	rect[2] = Math.min(rect[2], 787)
	rect[3] = Math.min(rect[3], 1400)
	return rect
}
/** 显示图层下所有的子图层 */
function showLayer(layer){
    if(layer.length > 0){
        for (var j = 0; j < layer.length; j++) {
            showLayer(layer[j]);
        }
    } else if (layer.layers && layer.layers.length > 0){
        if(!layer.visible){
            layer.visible = true;
        }
        for (var j = 0; j < layer.layers.length; j++) {
            showLayer(layer.layers[j]);
        }
    } else {
        if(!layer.visible){
            layer.visible = true;
        }
    }
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
    if(isPng){
        options.compression = 6;
    } else {
        options.quality = 6;
    }

    //定义一个变量[asCopy]，用来指定图片以副本的方式保存。
    var asCopy = true;

    //定义一个变量[extensionType]，用来指定图片名称的后缀为小写的.png。
    var extensionType = Extension.LOWERCASE;

    if(rect){
        doc.crop(rect);
        // doc.trim(TrimType.TRANSPARENT, true, true, true, true);
    }
    doc.saveAs(pngFile, options, asCopy, extensionType);
    if(rect){
	    app.activeDocument.activeHistoryState = app.activeDocument.historyStates[app.activeDocument.historyStates.length-2];
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
    var f=new File(strOutputPath + strOutputFile);
    if(f){
        f.open("w");
        f.write(str);
        f.close();
    }
}
/** ------------------------------------------------------------------------------------------------------------------------ */
/** 输出基础路径 */
const OUT_PUT_BASE_DIR_NAME = "mlpp_template";
/** 返回文件导出目录 */
function outputDir() {
    var strDocumentName = app.activeDocument.name.substr(0, app.activeDocument.name.length - 4);
    return app.activeDocument.path + "/" + strDocumentName + "/" + OUT_PUT_BASE_DIR_NAME + "/";
}

/** ----------------------------------------------------------------------------------------------------------------------- */

function main() {
    app.bringToFront();
    if (!documents.length) {
        alert("ps没有打开文档");
        return;
    }
    var start_time = new Date().getTime() / 1000;
    // 导出当前活动文档
    exportTemplate(app.activeDocument);

    var COSTTIME = (new Date().getTime() / 1000 - start_time);
    var min = Math.floor(COSTTIME / 60);
    var second = Math.floor(COSTTIME % 60);
    var timeStr = min > 0? (min + "分钟 ") : "" + second + "秒";
    alert("导出完成" + ", 总耗时：" + timeStr, "魔力装扮");
    return 99;
}

var all_layers = [];



// 导出当前活动文档
function exportTemplate(document){
    all_layers = app.activeDocument.layers;
    app.activeDocument = document; // switch active document
    // $.writeln("documents.resolution = " + app.activeDocument.resolution); 

    exportDetail();
    for (var i = all_layers.length - 1; i >= 0; i--) {
        all_layers[i].visible = false;
    }
    var hasType = false;
    for (var i = all_layers.length - 1; i >= 0; i--) {
        var subLayer = all_layers[i];
        if(!subLayer.layers){
            continue;
        }
        if(subLayer.name == "背景"){
            exportOneLayer(subLayer, "bg.png");
        } else if (subLayer.name == "人物") {
            exportOneLayer(subLayer, "people.png", true);
            // $.writeln("documents.resolution = " + getLayerRect(subLayer));
            exportJson(outputDir(), "people.json", "{\"bounds\":[" + getLayerRect(subLayer) + "]}");
        } 
        // else if (subLayer.name == "相框") {
        //     exportOneLayer(subLayer, "frame.png", true);
        //     exportJson(outputDir(), "frame.json", "{\"bounds\":[" + getLayerRect(subLayer) + "]}");
        // } 
        else if (subLayer.name == "元素") {
            exportElement(subLayer);
        } else {
            if(subLayer.layers.length == 0){
                exportJson(outputDir(), "type.json", "{\"key\":\"" + subLayer.name + "\"}");
                hasType = true;
            }
        }
    }
    if(!hasType){
        exportJson(outputDir(), "type.json", "{\"key\":\"avatar\"}");
    }
    showLayer(all_layers); // 显示所有图层
}
/** 导出详情 */
function exportDetail(){
    showLayer(all_layers); // 显示所有图层
    exportDocument(outputDir(), "details.png");
    var width = app.activeDocument.width.as("px");
    var height = app.activeDocument.height.as("px");
    app.activeDocument.resizeImage(UnitValue("200 px"), UnitValue(Math.round(200/width*height) + " px"));
    exportDocument(outputDir(), "details_icon.png");
    app.activeDocument.activeHistoryState = app.activeDocument.historyStates[app.activeDocument.historyStates.length-2];
}
/** 导出一个图层 */
function exportOneLayer(layer, strOutputFile, hasRect){
    layer.visible = true;
    exportDocument(outputDir(), strOutputFile, hasRect ? getLayerRect(layer) : null);
    layer.visible = false;
}
/** 导出元素层 */
function exportElement(elementLayer){
    elementLayer.visible = true;
    for (var j = 0; j < elementLayer.layers.length; j++) {
        elementLayer.layers[j].visible = false;
    }

    var nameMap = {};
    var keyLength = 0;
    var jsonObj = {};
    for (var i = elementLayer.layers.length - 1; i >= 0; i--) {
        var subLayer = elementLayer.layers[i];
        if(typeof nameMap[subLayer.name] == "undefined"){
            nameMap[subLayer.name] = 1;
            keyLength++;
        } else {
            nameMap[subLayer.name]++;
        }
        var strOutputFile = keyLength + "#" + nameMap[subLayer.name] + ".png";
        var rect =  exportOneElement(subLayer, strOutputFile);
        jsonStr = jsonStr + "\"" + strOutputFile + "\"" + ":[" + rect + "]";
        if(i > 0){
            jsonStr += ",";
        }
    }
    jsonStr += "}";
    exportJson(outputDir() + "element/", "config.json", jsonStr);
    elementLayer.visible = false;
}
/** 导出一个元素 */
function exportOneElement(eleLayer, strOutputFile){
    eleLayer.visible = true;
    var rect = getLayerRect(eleLayer);
    exportDocument(outputDir() + "element/", strOutputFile, rect);
    eleLayer.visible = false;
    return rect;
}

// function test(layer){
//     app.activeDocument.activeLayer = layer;
//     var ref = new ActionReference();  
//     ref.putEnumerated( charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt") );   
//     var desc = executeActionGet(ref)//.getObjectValue(stringIDToTypeID('keyOriginType'));  
//     // var style = desc.getList(stringIDToTypeID('textStyleRange')).getObjectValue(0).getObjectValue(stringIDToTypeID('textStyle'));
    
//     // // var color = style.getObjectValue(stringIDToTypeID("color"))
//     $.writeln("测试3")
//     var s = desc;
//     var str = ""
//     for (var i = 0; i < s.count; i++) {
//         str += 'Key ' + i + ' = ' + t2s(s.getKey(i)) + ': ' + s.getType(s.getKey(i)) + ' = ' + getValues(s, i) + '\n';
//     };
//     $.writeln("测试3", str)
// }

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

if(confirm("export ?")) {
    main();
}
