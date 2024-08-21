const crypto = require('crypto');
const fs = require('node:fs');

function createMD5(filePath) {
  return new Promise((res, rej) => {
    const hash = crypto.createHash('md5');
    
    const rStream = fs.createReadStream(filePath);
    rStream.on('data', (data) => {
      hash.update(data);
    });
    rStream.on('end', () => {
      res(hash.digest('base64'));
    });
  })
}

async function main() {
  const res = await createMD5("./cappucino.mp3")
  console.log(res);
  console.log(res == "5tbr2INXmj4Tgb0iqy46aQ==");
}

main();
