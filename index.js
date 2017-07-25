// const FtpSvr = require('ftp-srv');
// const AzureStorage = require('azure-storage');
// const Path = require('path');
// const Promise = require('bluebird');
// const Fs = Promise.promisifyAll(require('fs'), {suffix: 'Promised'});

// //const FileSystem = require('C:\Github\XiaoningLiu\azure-storage-ftp\node_modules\ftp-srv\src\fs.js');
// const {FileSystem} = require('ftp-srv');


/* Following are samples only */
// For Azure Storage
// var storageAccount = 'browserifytest';
// var SASToken = '?sv=2015-12-11&ss=bfqt&srt=sco&sp=rwdlacup&se=2017-12-27T22:19:10Z&st=2016-12-27T14:19:10Z&spr=https&sig=IHhkdpaB9PkccStZvSSqMxFSA16SMSQwIDFB97XStOY%3D';
// var blobURI = `https://${storageAccount}.blob.core.windows.net`;
// console.log(blobURI);

// var blobService = AzureStorage.createBlobServiceWithSas(blobURI, SASToken);
// blobService.createContainerIfNotExists('mycontainer', function (err, res) {
//     if (!err) {
//         blobService.createBlockBlobFromText('mycontainer', 'myblob', 'Hello World!', function (err, res) {
//             if (!err) {
//                 console.log('Create blob successfully');
//                 blobService.getBlobToText('mycontainer', 'myblob', function (err, res) {
//                     if (!err) {
//                         console.log(res);
//                     }
//                 });
//             } else {
//                 console.error(err);
//             }
//         });
//     } else {
//         console.error(err);
//     }
// });

/* ftp-srv samples */

// Declare FS
// const fs = new FileSystem(this);
// fs.list = function(path = '.') {
//     console.log('list');
//     return Fs.readdirPromised(path)
//     .map((entry) => {
//         return Fs.statPromised(Path.resolve(path, entry))
//         .then((stat) => {
//             stat.name = entry;
//             return stat;
//         });
//     })
//     .then((entries) => {
//         // Adds . folder
//         return Fs.statPromised(path)
//         .then((stat) => {
//             stat.name = '.';
//             entries.push(stat);
//             return entries;
//         });
//     });
// };  

// const ftpServer = new FtpSvr('ftp://0.0.0.0:1234', {
//     pasv_range: '8000-9000',
//     greeting: 'Welcome join our FTP!',
//     anonymous: true
// });

// ftpServer.on('login', (data, resolve, reject) => { 
//     console.log("Hello World!");
//     console.log("data");
//     // console.log(data);
//     resolve({
//         fs: fs,
//         // root: "C://Github//XiaoningLiu//azure-storage-ftp",
//         // cwd: ""
//     });
// });

// ftpServer.on('client-error', function (connection, context, error) { 
//     console.log(err);
//     console.err(err);
// });

// ftpServer.listen()
// .then(() => { 
//     console.log("Hello World!");
//  });

const bunyan = require('bunyan');
const FtpServer = require('ftp-srv');
const FileSystem = FtpServer.FileSystem;
const fs = require('fs');

class AzureStorageFileSystem extends FileSystem {
    constructor() {
        super(...arguments);
        this.storageAccount = '';
        this.storageBlobURI = '';
        this.storageSASToken = '';
    }

    // get(fileName) {
    //     console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    //     return fs.stat('C:\\Users\\xiaonli\\Downloads\\ChromeSetup.exe');
    // }

    // list(filepath) {
    //     console.log('READDIR....................');
    //     return fs.readdirSync('.');
    // }
}

const log = bunyan.createLogger({name: 'test'});
log.level('trace');

const server = new FtpServer('ftp://127.0.0.1:8881', {
  log,
  pasv_range: 8882,
  greeting: ['Welcome', 'to', 'the', 'jungle!'],
  file_format: 'ep',
  anonymous: 'sillyrabbit'
});
server.on('login', ({username, password}, resolve, reject) => {
  if (username === 'test' && password === 'test' || username === 'anonymous') {
    var root = require('os').homedir();
    var cwd = '';
    resolve({
         root: require('os').homedir(),
         fs: new AzureStorageFileSystem(null, {root, cwd})
    });
  } else reject('Bad username or password');
});
server.listen();
