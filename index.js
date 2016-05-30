const fs = require('fs');
const path = require('path');
const async = require('async');
const compare = require('./lib/compare');
const directory = require('./lib/directory');

const args = Array.prototype.slice.call(process.argv, 2);

if (args.length === 0) {
    console.log('Provide directory name.');
    process.exit(0);
}

let dir = args[0];
let fileMap = new Map();
let duplicates = [];

directory.traverseDirectoryTree(dir, (dir, stats) => {
    if (stats.isFile()) {
        addFileToSizeBucket(dir, stats);
    }
}, err => {
    if (err) {
        return console.error(err);
    }

    findDuplicatesInBuckets((err, duplicates) => {
        duplicates.forEach(bucket => bucket.forEach(entry => console.log(entry)));
        console.log();
    });
});

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
                compare.compareFiles(firstPath, secondPath, fileSize, (err, areSame) => {
                    if (areSame) {
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

function removeFilesFromBucket(bucket, toRemove) {
    for (let i = 0; i < toRemove.length; i++) {
        let index = bucket.indexOf(toRemove[i]);
        bucket.splice(index, 1);
    }
}