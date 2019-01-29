const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const readline = require('readline');
var csv = require('csv-parser')
var xlsx = require('node-xlsx');
var replaceExt = require('replace-ext');
var argv = require('minimist')(process.argv.slice(2));
var Promise = require('bluebird');

// Arguments///////////////////
var nameFile = argv.f;
var configJSON = argv.j;
console.log(' foldername : '+ nameFile+' Json : '+configJSON);
///////////////////////////////

//////// functions helpers

const walkDir = function(dir, filelist,ext) {
  function extension3(element) {
    var extName = path.extname(element);
    return extName === '' + ext;
  };
  var path = path || require('path');
  var fs = fs || require('fs'),
  files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkDir(path.join(dir, file), filelist,ext);
    }
    else {

      if(path.extname(file) == ext){
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
};

function indexKey(list,key){
  return list.indexOf(key);
}

function isRelated(attributes,row1,row2){
  var key = '';
  var index =  indexKey(attributes,key );
  if(row1[index]==row2[index]){return true;}
  else{return false;}
};

/////

function arrayFrom(file,fileFormat){
  console.log('arrayFrom');
  var obj = [];
  if(fileFormat == 'xls'){
    obj = xlsx.parse(file);
  }
  var rows = [];
  for(var i = 0; i < obj.length; i++){
    var sheet = obj[i];
    for(var j = 0; j < sheet['data'].length; j++){
      rows.push(sheet['data'][j]);
    }
  }
  return rows;
}

function arrayFromXLSX(file){
  console.log('arrayFromXLSX');
  var obj = xlsx.parse(file);
  var rows = [];
  for(var i = 0; i < obj.length; i++){
    var sheet = obj[i];
    for(var j = 0; j < sheet['data'].length; j++){
      rows.push(sheet['data'][j]);
    }
  }
  return rows;
}

function fileFilter(file, jsonFile){
  var filteredTab = [];
  if(file != undefined && jsonFile != undefined){
      let config = fs.readFileSync(jsonFile);
      let _json =  JSON.parse(config);
      let _fileFormat = _json.fileformat;
      console.log(_fileFormat);
      var data = arrayFrom(file,_fileFormat);
      let jsonAttr = _json.filter;
      let attributes = data[0];

      filteredTab.push(attributes);
      var lastRow=[];
      for( var l in data){
        var newRow = data[l];
        var isLinked = isRelated(attributes,lastRow,newRow);
        for (var key in jsonAttr ){
          var index =  indexKey(attributes,key );
          if(index != -1){
            if(data[l][index] == jsonAttr[key]){
              filteredTab.push(data[l]);
            }
            else if(isLinked){
            //  filteredTab.push(data[l]);
            }
          }
        }
        lastRow = data[l];
      }
      return filteredTab ;
  }
}


function exportData(file,list,callback){
  console.log("exportData");
  var folders = file.split(path.sep);
  var parentDirectory = folders[folders.length - 2];
  var fileDirectory = path.sep+folders[folders.length - 2]+path.sep;
  var resultPath = os.homedir() + path.sep+'dataExport'+fileDirectory;
  console.log(resultPath);
  fs.ensureDir(resultPath)
  .then(() => {
    var writeStr ='';
    if(list.length >1){
      for(var i = 0; i < list.length; i++){
        writeStr += list[i].join(";") + "\n";
      }
      var dest = resultPath + replaceExt(path.basename(file), '.csv');
      fs.writeFile(dest, writeStr,'ascii', function(err) {
        if(err) {
          return console.log(err);
        }
        console.log(" Export "+ dest);
        callback();
      });
    }
    else{
      callback();
    }
  })
  .catch(err => {
    console.error(err)
  })
}


function filterXLSX(file,jsonFile){
  console.log('--filterXLSX');
  return new Promise((resolve, reject) => {
    var filteredList = fileFilter(file,jsonFile);
    exportData(file,filteredList, function(){
      resolve();
    });
  });
}

function filteredProcessAndFilter(list,jsonFile){
  console.log('filteredProcessAndFilter');
  var promises = [];
  for( let i in list){
    promises.push(filterXLSX(list[i],jsonFile));
  }
  return Promise.all(promises);
}

function filterData(folder,jsonFile){
  var stats = fs.statSync(folder);
  if(stats.isDirectory()){
    console.log('folder : '+folder);
    var filelist = [];
    walkDir(folder,filelist,'.xls');
    filteredProcessAndFilter(filelist,jsonFile).then(function() {
      console.log('**************************************************');
    }, function(err) {
      console.log(' An error occured ');

    });
    console.log("----");
  }else{
    console.log('give a folder path');
  }
};

filterData(nameFile,configJSON);
