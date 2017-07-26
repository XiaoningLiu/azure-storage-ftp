const AzureStorage = require('azure-storage');
const _ = require('lodash');
const nodePath = require('path');
const uuid = require('uuid');
const when = require('when');
const whenNode = require('when/node');
const syncFs = require('fs');
const fs = whenNode.liftAll(syncFs);
const bunyan = require('bunyan');
const FtpServer = require('ftp-srv');
const FileSystem = FtpServer.FileSystem;
const thenify = require('thenify');

class AzureStorageFileSystem extends FileSystem {
    constructor(connection, { root, cwd, storageAccount, storageSASToken } = {}) {
        super(connection, { root, cwd });

        this.storageAccount = storageAccount || '';
        this.storageBlobURI = `https://${storageAccount}.blob.core.windows.net`;
        this.storageSASToken = storageSASToken || '';
        this.blobService = AzureStorage.createBlobServiceWithSas(this.storageBlobURI, this.storageSASToken);
        this.currentContainer = ''; // Current Container
    }

    _getBlobName(serverPath) {
        var splittedPath = serverPath.split(nodePath.sep);
        return splittedPath.length === 3 ? splittedPath[3] : '';
    }

    get(fileName) {
        const { serverPath } = this._resolvePath(fileName);
        var self = this;
        if (serverPath === nodePath.sep) {
            // If this is root
            // console.log('Root');
            return {
                name: nodePath.sep,
                isDirectory: function () { return true }
            };
        } else if ((serverPath.split(nodePath.sep).length - 1) === 1) {
            // If this is container
            //currentContainerName = serverPath.split(nodePath.sep)[1];
            return thenify(function (callback) {
                self.blobService.getContainerProperties(serverPath.split(nodePath.sep)[1], function (err, res) {
                    //console.log(self.container.name);
                    callback(err, res);
                });
            })().then(function (values) {
                // TODO: transform storage returned values into fs.stat like objects (in above method comments)
                return {
                    name: serverPath.split(nodePath.sep)[1], // container/blob
                    isDirectory: function () { return true }, // Return true when it's a container
                    dev: 920907695,
                    mode: 16822,
                    nlink: 1,
                    uid: 0,
                    gid: 0,
                    rdev: 0,
                    blksize: undefined,
                    ino: 281474976890711,
                    size: 0,
                    blocks: undefined,
                    atime: new Date('2017-04-06T13:02:44.397Z'),
                    mtime: new Date('2017-04-06T13:02:44.397Z'),
                    ctime: new Date('2017-07-21T06:13:17.006Z'),
                    birthtime: new Date('2017-04-06T13:02:44.396Z')
                };
            }).catch(function (err) {
                // TODO: deal with err
                return {
                    isDirectory: function () { return false; }
                };
            });
        } else if ((serverPath.split(nodePath.sep).length - 1) === 2) {
            // If this is blob
            //currentContainerName = serverPath.split(nodePath.sep)[1];
            //currentBlobName = serverPath.split(nodePath.sep)[2];
            return thenify(function (callback) {
                self.blobService.getBlobProperties(serverPath.split(nodePath.sep)[1], serverPath.split(nodePath.sep)[2], function (err, res) {
                    callback(err, res);
                });
            })().then(function (values) {
                // TODO: transform storage returned values into fs.stat like objects (in above method comments)
                return {
                    name: serverPath.split(nodePath.sep)[2], // container/blob name
                    isDirectory: function () { return false }, // Return false when it's a blob
                    dev: 920907695,
                    mode: 16822,
                    nlink: 1,
                    uid: 0,
                    gid: 0,
                    rdev: 0,
                    blksize: undefined,
                    ino: 281474976890711,
                    size: 0,
                    blocks: undefined,
                    atime: new Date('2017-04-06T13:02:44.397Z'),
                    mtime: new Date('2017-04-06T13:02:44.397Z'),
                    ctime: new Date('2017-07-21T06:13:17.006Z'),
                    birthtime: new Date('2017-04-06T13:02:44.396Z')
                };
            }).catch(function (err) {
                // TODO: deal with err
                return {
                    isDirectory: function () { return false }, // Return false when it's a blob
                };
            });
        } else {
            console.log('Blob with Folder Error!');
            return null;
        }
    };

    mkdir(path) {
        const { serverPath } = this._resolvePath(path);
        var path = serverPath.substr(1);

        var self = this;
        if (self.currentContainer != '') {
            throw new Error('Creating virtual directories under containers is not support.');
        }

        thenify(function (callback) {
            self.blobService.createContainerIfNotExists(path, function (error, res) {
                callback(error, res);
            });
        })().then(function (res) {
            return res;
        });
    }

    /*
    * return {
        name: 'xxx', // container/blob name
        isDirectory: function () { return true }, // Return true when it's a container
        dev: 920907695,
        mode: 16822,
        nlink: 1,
        uid: 0,
        gid: 0,
        rdev: 0,
        blksize: undefined,
        ino: 281474976890711,
        size: 0,
        blocks: undefined,
        atime: new Date('2017-04-06T13:02:44.397Z'),
        mtime: new Date('2017-04-06T13:02:44.397Z'),
        ctime: new Date('2017-07-21T06:13:17.006Z'),
        birthtime: new Date('2017-04-06T13:02:44.396Z')
        }
    */
    list(path = '.') {
        var self = this;
        console.log(`LIST ${path}`);
        return thenify(function (callback) {
            if (self.currentContainer.length === 0) {
                self.blobService.listContainersSegmented(null, function (err, res) {
                    callback(err, res);
                });
            } else {
                self.blobService.listBlobsSegmented(self.currentContainer, null, function (err, res) {
                    callback(err, res);
                });
            }
        })().then(function (values) {
            var isDirectory = self.currentContainer.length === 0;
            return values.entries.map((value) => {
                return {
                    name: value.name, // container/blob name
                    isDirectory: function () { return isDirectory }, // Return true when it's a container
                    dev: 920907695,
                    mode: 16822,
                    nlink: 1,
                    uid: 0,
                    gid: 0,
                    rdev: 0,
                    blksize: undefined,
                    ino: 281474976890711,
                    size: 0,
                    blocks: undefined,
                    atime: new Date(value.lastModified),
                    mtime: new Date(value.lastModified),
                    ctime: new Date(value.lastModified),
                    birthtime: new Date(value.lastModified)
                };
            });
        }).then(function (values) {
            return values;
        }).catch(function (err) {
            return [];
        });
    }

    chdir(path = '.') {
        console.log(`CHDIR ${path}`);
        var self = this;
        const { serverPath } = self._resolvePath(path);
        if (serverPath === nodePath.sep) {
            self.currentContainer = '';
            self.cwd = serverPath;
            return self.cwd;
        }

        self.currentContainer = serverPath.split(nodePath.sep)[1];
        return thenify(function (callback) {
            self.blobService.doesContainerExist(self.currentContainer, function (err, res) {
                callback(err, res);
            });
        })().then(function (values) {
            if (values.exists) {
                self.cwd = serverPath;
                return self.cwd;
            }
        });
    }

    delete(path) {
        var self = this;
        const { serverPath } = self._resolvePath(path);
        if (serverPath === nodePath.sep) {
            return;
        }

        var len = serverPath.split(nodePath.sep).length - 1;
        if (len == 1) {
            return thenify(function (callback) {
                self.blobService.deleteContainerIfExists(path, function (err, res) {
                    callback(err, res);
                });
            })().then(function (values) {
                return values;
            });
        } else if (len == 2) {
            return thenify(function (callback) {
                self.blobService.deleteBlobIfExists(self.currentContainer, path, function (err, res) {
                    callback(err, res);
                });
            })().then(function (values) {
                return values;
            });
        } else {
            return;
        }
    }

    read(fileName, { start = undefined } = {}) {
        var self = this;
        return thenify(function (callback) {
            var stream = self.blobService.createReadStream(self.currentContainer, fileName, function (err, res) {

            });
            callback(null, stream);
        })().then(function (stream) {
            return stream;
        });
    }

    write(fileName, { append = false, start = undefined } = {}) {
        var self = this;
        return thenify(function (callback) {
            var stream = self.blobService.createWriteStreamToBlockBlob(self.currentContainer, fileName, function (err, res) {

            });
            callback(null, stream);
        })().then(function (stream) {
            return stream;
        });
    }

    rename(from, to) {
        throw new Error('Cannot support the rename operation!');

    }

    chmod(path, mode) {
        throw new Error('Cannot support the chmod operation!');

    }

}

const log = bunyan.createLogger({ name: 'test' });
log.level('debug');

const server = new FtpServer('ftp://127.0.0.1:8881', {
    log,
    pasv_range: 8882,
    greeting: ['Welcome', 'to', 'the', 'Windows', 'Azure', 'Storage', 'FTP']
});
server.on('login', ({ username, password }, resolve, reject) => {
    var root = '';
    var cwd = '';
    var storageAccount = username;
    var storageSASToken = password;

    var storageBlobURI = `https://${storageAccount}.blob.core.windows.net`;
    var blobService = AzureStorage.createBlobServiceWithSas(storageBlobURI, storageSASToken);
    blobService.listContainersSegmented(null, function (err, res) {
        if (err) {
            reject("Invalid Azure Storage Account Name and SASToken");
        } else {
            resolve({
                root: root,
                fs: new AzureStorageFileSystem(null, { root, cwd, storageAccount, storageSASToken })
            });
        }
    });
});
server.listen();