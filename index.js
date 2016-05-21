const fs = require('fs');
const path = require('path');
const async = require('async');
const args = Array.prototype.slice.call(process.argv, 2);

const BUFFER_SIZE = 128;

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
    async.each(fileMap, (bucket, cb) => {
        if (bucket.length === 1) {
            return cb();
        }

        let fileSize = bucket[0];
        let bucketFiles = bucket[1];

        async.whilst(() => bucketFiles.length > 1, compareFiles);

        function compareFiles(cb) {
            let firstPath = bucketFiles.shift();
            async.eachSeries(bucketFiles, (secondPath, eachCb) => {
                fs.open(firstPath, 'r', (err, firstFd) => {
                    fs.open(secondPath, 'r', (err, secondFd) => {
                        console.log(`Comparing: ${firstPath} with ${secondPath}`);
                        let firstBuffer = new Buffer(BUFFER_SIZE);
                        let secondBuffer = new Buffer(BUFFER_SIZE);
                        let bytesRead = 0;
                        let buffersEqual = true;
                        async.whilst(() => buffersEqual && (bytesRead < fileSize), cb => {
                            async.parallel([
                                cb => fs.read(firstFd, firstBuffer, 0, BUFFER_SIZE, null, cb),
                                cb => fs.read(secondFd, secondBuffer, 0, BUFFER_SIZE, null, cb)
                            ], (err, data) => {
                                if (err) {
                                    cb(err);
                                }

                                if (firstBuffer.compare(secondBuffer) !== 0) {
                                    buffersEqual = false;
                                }
                                bytesRead += data[0][0];
                                cb();
                            });
                        }, () => {
                            console.log(`Files compared: ${firstPath}, ${secondPath}, equal: ${buffersEqual}`);
                            async.parallel([
                                cb => fs.close(firstFd, cb),
                                cb => fs.close(secondFd, cb)
                            ], eachCb);
                        });
                    });
                });
            }, cb);

        }
    }, cb);
}
