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

    findDuplicatesInBuckets((err, duplicates) => {
        duplicates.forEach(bucket => bucket.forEach(entry => console.log(entry)));
        console.log();
    });
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
    async.each(fileMap, (bucket, eachFileCb) => {
        if (bucket.length === 1) {
            return eachFileCb();
        }

        let fileSize = bucket[0];
        let bucketFiles = bucket[1];

        async.whilst(() => bucketFiles.length > 1, compareFilesInBucket, eachFileCb);

        function compareFilesInBucket(compareCb) {
            let firstPath = bucketFiles.shift();
            let bucket = [firstPath];
            async.eachSeries(bucketFiles, (secondPath, eachCb) => {
                compareFiles(firstPath, secondPath, fileSize, (err, areSame) => {
                    if(areSame) {
                        bucket.push(secondPath);
                    }
                    eachCb();
                });
            }, () => {
                if (bucket.length > 1) {
                    duplicates.push(bucket);
                    removeFilesFromBucket(bucketFiles, bucket);
                }

                compareCb();
            });
        }
    }, () => {
        cb(null, duplicates);
    });
}

function compareFiles(first, second, size, cb) {
    fs.open(first, 'r', (err, firstFd) => {
        fs.open(second, 'r', (err, secondFd) => {
            let firstBuffer = new Buffer(BUFFER_SIZE);
            let secondBuffer = new Buffer(BUFFER_SIZE);
            let bytesRead = 0;
            let buffersEqual = true;

            async.whilst(() => buffersEqual && (bytesRead < size), cb => {
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
                async.parallel([
                    cb => fs.close(firstFd, cb),
                    cb => fs.close(secondFd, cb)
                ], () => cb(null, buffersEqual));
            });
        });
    });
}

function removeFilesFromBucket(bucket, toRemove) {
    for (let i = 0; i < toRemove.length; i++) {
        let index = bucket.indexOf(toRemove[i]);
        bucket.splice(index, 1);
    }
}