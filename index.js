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
let duplicates = [];

processDirectory(dir, err => {
    if (err) {
        return console.error(err);
    }

    findDuplicatesInBuckets();
});

function processDirectory(dir, cb) {
    fs.stat(dir, (err, stats) => {
        if (err) {
            if (err.code === 'ENOENT') {
                console.error(`File: ${dir} does not exist.`);
                cb();
            } else {
                return cb(err);
            }
        }

        if (stats.isDirectory()) {
            fs.readdir(dir, (err, files) => {
                async.each(files, (file, cb) => processDirectory(path.join(dir, file), cb), cb);
            });
        } else if (stats.isFile()) {
            addFileToSizeBucket(dir, stats);
            cb();
        }
    });
}

function addFileToSizeBucket(file, stats) {
    if (!fileMap.has(stats.size)) {
        fileMap.set(stats.size, []);
    }

    fileMap.get(stats.size).push(file);
}

function findDuplicatesInBuckets(cb) {
    console.log(fileMap);
    async.each(fileMap, (bucket, cb) => {
        if (bucket.length === 1) {
            return cb();
        }

        let fileSize = bucket[0];
        let bucketFiles = bucket[1];

        async.whilst(() => bucketFiles.length > 1, compareFiles);

        function compareFiles(cb) {
            let firstPath = bucketFiles.pop();
            console.log(bucketFiles);
            fs.open(firstPath, 'r', (err, firstFd) => {
                async.each(bucketFiles, (secondPath, eachCb) => {
                    fs.open(secondPath, 'r', (err, secondFd) => {
                        let firstBuffer = new Buffer(1024);
                        let secondBuffer = new Buffer(1024);
                        let bytesRead = 0;
                        async.whilst(() => bytesRead < fileSize, cb => {
                            async.parallel([
                                cb => fs.read(firstFd, firstBuffer, 0, 1024, null, cb),
                                cb => fs.read(secondFd, secondBuffer, 0, 1024, null, cb) 
                            ], (err, data) => {
                                //console.dir(data);
                                cb(data);
                            });
                        }, () => {
                            console.log(`Files processed: ${firstPath}, ${secondPath}`);
                            return eachCb();
                        });
                    });
                }, cb);
            });

        }
    }, cb);
}
