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

    /*
    * return {
        name: 'xxx', // container/blob name
        isDirectory: function () { return true }, // Return true when it's a container
        // dev: 920907695,
        // mode: 16822,
        // nlink: 1,
        // uid: 0,
        // gid: 0,
        // rdev: 0,
        // blksize: undefined,
        // ino: 281474976890711,
        // size: 0,
        // blocks: undefined,
        // atime: new Date('2017-04-06T13:02:44.397Z'),
        // mtime: new Date('2017-04-06T13:02:44.397Z'),
        // ctime: new Date('2017-07-21T06:13:17.006Z'),
        // birthtime: new Date('2017-04-06T13:02:44.396Z')
        }
    */

    _getBlobName(serverPath) {
        var splittedPath = serverPath.split('\\');
        return splittedPath.length === 3 ? splittedPath[3] : '';
    }

    get(fileName) {
        const { serverPath } = this._resolvePath(fileName);
        var self = this;
        if (serverPath === '\\') {
            // If this is root
            // console.log('Root');
            return {
                name: '\\',
                isDirectory: function () { return true }
            };
        } else if ((serverPath.split('\\').length - 1) === 1) {
            // If this is container
            //currentContainerName = serverPath.split('\\')[1];
            return thenify(function (callback) {
                self.blobService.getContainerProperties(serverPath.split('\\')[1], function (err, res) {
                    //console.log(self.container.name);
                    callback(err, res);
                });
            })().then(function (values) {
                // TODO: transform storage returned values into fs.stat like objects (in above method comments)
                return {
                    name: serverPath.split('\\')[1], // container/blob
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

                };
            });
        } else if ((serverPath.split('\\').length - 1) === 2) {
            // If this is blob
            //currentContainerName = serverPath.split('\\')[1];
            //currentBlobName = serverPath.split('\\')[2];
            return thenify(function (callback) {
                self.blobService.getBlobProperties(serverPath.split('\\')[1], serverPath.split('\\')[2], function (err, res) {
                    callback(err, res);
                });
            })().then(function (values) {
                // TODO: transform storage returned values into fs.stat like objects (in above method comments)
                return {
                    name: serverPath.split('\\')[2], // container/blob name
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

                };
            });
        } else {
            console.log('Blob with Folder Error!');
            return null;
        }
    };

    mkdir(path) {

        const {serverPath} = this._resolvePath(path);
        var path=serverPath.substr(1);
        
        var self = this;
        function fn(path,level,cb){
            self.blobService.createContainer(path,level, function (error){
                if (error!=null){
                    cb(error.message);
                }
                else{
                    cb(null);
                }
           }); 
        }
        const p=thenify(fn);
        p(path,{publicAccessLevel : 'blob'})
        .then(val =>{
            console.log("path:");
            console.log(path);
            return serverPath; 
        })
        .catch(err=>{
            console.log(err);
            return '.';
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
            // console.log(values);
            // TODO: transform storage returned values into fs.stat like objects (in above method comments)
            return values;
        }).catch(function (err) {
            // TODO: deal with err
            return [{}];
        });
    }

    chdir(path = '.') {
        var self = this;
        const { serverPath } = self._resolvePath(path);
        if (serverPath === '\\') {
            self.currentContainer = '';
            self.cwd = serverPath;
            return self.cwd;
        }

        self.currentContainer = serverPath.split('\\')[1];
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
        if (serverPath === '\\') {
            return;
        }

        var len = serverPath.split('\\').length - 1;
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

    rename(from,to)
    {      
        throw new Error('Cannot support the rename operation!');
       
    }
    
    chmod(path,mode){
        throw new Error('Cannot support the chmod operation!');
       
    }
    
}

const log = bunyan.createLogger({ name: 'test' });
log.level('debug');

const server = new FtpServer('ftp://127.0.0.1:21', {
    log,
    pasv_range: 8882,
    greeting: ['Welcome', 'to', 'the', 'Windows', 'Azure', 'Storage', 'FTP'],
    anonymous: 'sillyrabbit'
});
server.on('login', ({ username, password }, resolve, reject) => {
    if (username === 'test' && password === 'test' || username === 'anonymous') {
        var root = require('os').homedir();
        var cwd = '';
        var storageAccount = 'browserifytest';
        var storageSASToken = '?sv=2015-12-11&ss=bfqt&srt=sco&sp=rwdlacup&se=2017-12-27T22:19:10Z&st=2016-12-27T14:19:10Z&spr=https&sig=IHhkdpaB9PkccStZvSSqMxFSA16SMSQwIDFB97XStOY%3D';
        resolve({
            root: require('os').homedir(),
            fs: new AzureStorageFileSystem(null, { root, cwd, storageAccount, storageSASToken })
        });
    } else reject('Bad username or password');
});
server.listen();