const fs = require('fs');
const async = require('async');

const firstPath = 'test/b.js';
const secondPath = 'test/a.js';
let fileSize = null;

async.parallel([
    cb => fs.stat(firstPath, cb),
    cb => fs.stat(secondPath, cb)
], (err, result) => {
    fileSize = result[0].size;

    openFiles((err, descriptors) => compareFiles(descriptors, () => console.log('Finished.')));
});

function openFiles(cb) {
    async.parallel([
        cb => fs.open(firstPath, 'r', cb),
        cb => fs.open(secondPath, 'r', cb)
    ], cb);
}

function compareFiles(descriptors, cb) {
    let firstFd = descriptors[0];
    let secondFd = descriptors[1];

    let firstBuffer = new Buffer(50);
    let secondBuffer = new Buffer(50);
    let bytesRead = 0;
    let buffersEqual = true;

    async.whilst(() => buffersEqual && (bytesRead < fileSize), cb => {
        async.parallel([
            cb => fs.read(firstFd, firstBuffer, 0, 50, null, cb),
            cb => fs.read(secondFd, secondBuffer, 0, 50, null, cb)
        ], (err, data) => {
            if (err) {
                cb(err);
            }

            // for(let i = 0; i < data[0][1].length; i++) {
            //     console.log(`${data[0][1][i] !== data[1][1][i] ? '\033[31m' : ''}${data[0][1][i].toString(2)} - ${data[1][1][i].toString(2)}${'\033[0m'}`);
            // }


            if (firstBuffer.compare(secondBuffer) !== 0) {
                buffersEqual = false;
            }
            bytesRead += data[0][0];

           // firstBuffer = new Buffer(50);
           // secondBuffer = new Buffer(50);
            cb();
        });
    }, () => {
        console.log(`Files compared: ${firstPath}, ${secondPath}, equal: ${buffersEqual}`);
        cb();
    });
}