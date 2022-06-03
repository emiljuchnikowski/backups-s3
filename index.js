const dotenv = require('dotenv');
const AWS = require('aws-sdk');
const moment = require('moment');
const zip = require('zip-a-folder').zip;
const fs = require('fs');

dotenv.config();

const date = moment().format("YYYY-MM-DD HH:mm:ss");
const zipName = date + '.zip';

const s3 = new AWS.S3({
    endpoint: process.env.S3_URL + "/" + process.env.S3_BUCKET,
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
    s3BucketEndpoint: true,
});


console.log("get current items begin");
new Promise(function(resolve, reject) {
    s3.listObjects({Bucket: process.env.S3_BUCKET}, (err, res) => {
        if (err) reject(err);
        resolve(res.Contents.map(i => i));
    });
})
    .then(items => {
        console.log("get current items success");

        const tenDaysLeft = moment().subtract(
            process.env.DAYS_LEFT ? Number(process.env.DAYS_LEFT) : 10,
            "days"
        ).format("YYYY-MM-DD");

        const toRemove = items.filter(item => item.Key < tenDaysLeft);

        console.log("Remove backups: " + toRemove.map(i => i.Key).join(", "));

        return new Promise((resolve, reject) => {
            s3.deleteObjects({
                Bucket: process.env.S3_BUCKET,
                Delete: {
                    Objects: toRemove.map(i => ({ Key: i.Key }))
                }
            }, (err, res) => {
                if (err) reject(err);
                resolve();
            });
        });
    })
    .then(() => {
        console.log("remove backups success");
        console.log("begin zip");
      return zip(__dirname + "/" + 'data', __dirname + "/" + zipName);
    })
    .then(r => {
        console.log("success zip");

        const stream = fs.createReadStream(__dirname + "/" + zipName);

        console.log("begin upload");

        return new Promise((resolve, reject) => {
            const params = {Body: stream, Key: zipName, Bucket: process.env.S3_BUCKET};
            s3.upload(params, (err) => {
                if (err) reject(err);
                resolve(true);
            })
        });
    })
    .then(() => {
        console.log("success upload");

        fs.unlinkSync(zipName);
    })
    .catch(e => {
        console.error(e);
    });
