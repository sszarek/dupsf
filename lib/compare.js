const fs = require('fs');
const async = require('async');
const BUFFER_SIZE = 128;

function openFiles(firstPath, secondPath, cb) {
    async.parallel([
        cb => fs.open(firstPath, 'r', cb),
        cb => fs.open(secondPath, 'r', cb)
    ], (err, data) => {
        if (err) {
            return cb(err);
        }

        return cb(null, ...data);
    });
}

function readFileChunks(firstFd, secondFd, cb) {
    async.parallel([
        cb => fs.read(firstFd, Buffer.alloc(BUFFER_SIZE), 0, BUFFER_SIZE, null, cb),
        cb => fs.read(secondFd, Buffer.alloc(BUFFER_SIZE), 0, BUFFER_SIZE, null, cb)
    ], cb);
}

function closeFiles(firstFd, secondFd, cb) {
    async.parallel([
        cb => fs.close(firstFd, cb),
        cb => fs.close(secondFd, cb)
    ], cb);
}

module.exports = {
    compareFiles: function compareFiles(first, second, size, cb) {
        openFiles(first, second, (err, firstFd, secondFd) => {
            let bytesRead = 0;
            let buffersEqual = true;

            async.whilst(() => buffersEqual && (bytesRead < size), cb => {
                readFileChunks(firstFd, secondFd, (err, data) => {
                    if (err) {
                        return cb(err);
                    }
                    
                    let [firstChunkSize, firstBuffer] = data[0];
                    let secondBuffer = data[1][1];

                    if (firstBuffer.compare(secondBuffer) !== 0) {
                        buffersEqual = false;
                    }
                    bytesRead += firstChunkSize;

                    return cb();
                });
            }, () => closeFiles(firstFd, secondFd, () => cb(null, buffersEqual)));
        });
    }
};