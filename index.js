const FtpSvr = require('ftp-srv');
const AzureStorage = require('azure-storage');

/* Following are samples only */
// For Azure Storage
var storageAccount = '';
var SASToken = '';
var blobURI = `https://${storageAccount}.blob.core.windows.net`;
console.log(blobURI);

var blobService = AzureStorage.createBlobServiceWithSas(blobURI, SASToken);
blobService.createContainerIfNotExists('mycontainer', function (err, res) {
    if (!err) {
        blobService.createBlockBlobFromText('mycontainer', 'myblob', 'Hello World!', function (err, res) {
            if (!err) {
                console.log('Create blob successfully');
                blobService.getBlobToText('mycontainer', 'myblob', function (err, res) {
                    if (!err) {
                        console.log(res);
                    }
                });
            } else {
                console.error(err);
            }
        });
    } else {
        console.error(err);
    }
});

/* ftp-srv samples */
//const ftpServer = new FtpSvr('ftp://0.0.0.0:9876');

// ftpServer.on('login', (data, resolve, reject) => { 
//     console.log("Hello World!");
//     console.log("data");
//     console.log(data);
//     resolve({
//         root: "C://Github//XiaoningLiu\azure-storage-ftp",
//         cwd: "/"
//     });
// });

// ftpServer.listen()
// .then(() => { 
//     console.log("Hello World!");
//  });