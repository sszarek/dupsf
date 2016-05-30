const fs = require('fs');
const path = require('path');
const async = require('async');

module.exports = {
    traverseDirectoryTree: function traverseDirectoryTree(dir, func, cb) {
        fs.stat(dir, (err, stats) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    console.error(`File: ${dir} does not exist.`);
                    cb();
                } else {
                    return cb(err);
                }
            }

            func(dir, stats);

            if (stats.isDirectory()) {
                fs.readdir(dir, (err, files) => {
                    async.each(files, (file, cb) => traverseDirectoryTree(path.join(dir, file), func, cb), cb);
                });
            } else {
                return cb();
            }
        });
    }
};