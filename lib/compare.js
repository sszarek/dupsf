const fs = require('fs');
const async = require('async');
const BUFFER_SIZE = 128;

function closeFiles(firstFd, secondFd, cb) {
    async.parallel([
        cb => fs.close(firstFd, cb),
        cb => fs.close(secondFd, cb)
    ], cb);
}

module.exports = {
    compareFiles: function compareFiles(first, second, size, cb) {
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
                            return cb(err);
                        }

                        if (firstBuffer.compare(secondBuffer) !== 0) {
                            buffersEqual = false;
                        }
                        bytesRead += data[0][0];
                        
                        return cb();
                    });
                }, () => closeFiles(firstFd, secondFd, () => cb(null, buffersEqual)));
            });
        });
    }
};