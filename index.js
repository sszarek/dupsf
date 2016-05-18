const fs = require('fs');
const path = require('path');
const async = require('async');
const args = Array.prototype.slice.call(process.argv, 2);

if (args.length === 0) {
    console.log('Provide directory name.');
    process.exit(0);
}

let dir = args[0];
let fileMap = new Map();

processDirectory(dir, err => {
    console.error(err);
    console.log('end');
});

function processDirectory(dir, cb) {
    fs.stat(dir, (err, stats) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return console.error(`File: ${dir} does not exist.`);
            } else {
                return cb(err);
            }
        }
        if (stats.isDirectory()) {
            console.log(dir);
            fs.readdir(dir, (err, files) => {
                async.each(files, (file, cb) => processDirectory(path.join(dir, file), cb), cb);
            });
        } else if (stats.isFile()) {
            console.log(dir);
            processFileContents(dir, stats);
            cb();
        }
    });
}

function processFileContents(file, stats) {
    if (!fileMap.has(stats.size)) {
        fileMap.set(stats.size, []);
    } 
    
    fileMap.get(stats.size).push(file);
}