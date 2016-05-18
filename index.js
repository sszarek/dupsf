const fs = require('fs');
const args = Array.prototype.slice.call(process.argv, 2);

if (args.length === 0) {
    console.log('Provide directory name.');
    process.exit(0);
}

let dir = args[0];
let fileMap = new Map();

processDirectory(dir, err => {
    console.error(err);
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
            fs.readdir(dir, (err, files) => {
                files.forEach(file => processDirectory(file, cb));
            });
        } else if (stats.isFile()) {
            processFileContents(dir, stats);
        }
        console.log(dir);
    });
}

function processFileContents(file, stats) {
    if (!fileMap.has(stats.size)) {
        fileMap.set(stats.size, []);
    } 
    
    fileMap.get(stats.size).push(file);
}