const fs = require("fs");
const https = require("https");
const http = require("http");
const url = require("url");
const path = require("path");


const port = 3000;
const server = http.createServer();

server.on('listening', listen_handler);
server.listen(port);
function listen_handler() {
  console.log(`Now Listening on Port ${port}`);
}

// root endpoint
server.on("request", request_handler);
function request_handler(req, res) {
  console.log(`New Request from ${req.socket.remoteAddress} for ${req.url}`);
  if (req.url === "/") {
    const form = fs.createReadStream("./index.html");
    res.writeHead(200, {"Content-Type": "text/html"});
    form.pipe(res);
  }

  else if (req.url.startsWith("/css.css")) {
    // Serve CSS files in a similar way
    const cssPath = path.join(__dirname, "css.css");
    const cssStream = fs.createReadStream(cssPath);
    res.writeHead(200, { "Content-Type": "text/css" });
    cssStream.pipe(res);
  }

  else if (req.url.startsWith("/image/logo.png")) {
    // Serve image files in a similar way
    const imagePath = path.join(__dirname, "image", path.basename(req.url));
    const imageStream = fs.createReadStream(imagePath);
    res.writeHead(200, { "Content-Type": "image/png" }); // Adjust the content type based on your image type
    imageStream.pipe(res);
  }

  else if (req.url.startsWith("/auth")) {
    const code = url.parse(req.url, true).query.code;
    var token;

    const options = {
      hostname: 'api.dropbox.com',
      path: '/oauth2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    const authReq = https.request(options, function (res) {
      const chunks = [];

      res.on('data', function (chunk) {
        chunks.push(chunk);
      });

      res.on('end', function () {
        const body = Buffer.concat(chunks);
        token = JSON.parse(body).access_token;
        saveDogToDropbox(token);
      });
    });

    authReq.write(new URLSearchParams({
      'code': code,
      'grant_type': 'authorization_code',
      'redirect_uri': 'http://localhost:3000/auth',
      'client_id': 's6nk28m8pvvbq11',
      'client_secret': 'e8vjqg5umbehqsw'
    }).toString());
    authReq.end();

    res.writeHead(302, {'Location': '/'});
    res.end();
  }
}


function saveDogToDropbox(token) {
  checkFolderExist(token, function(err, folderExist) {
    createFolder(token, folderExist, function(err, status) {
      getRandomDog(function(err, dogImageUrl) {
        uploadFile(token, dogImageUrl, function(err) {
        })
      })
    })
  })
}

function checkFolderExist(token, callback) {
  let folderExist = '';
  const options = {
    hostname: 'api.dropbox.com',
    path: '/2/files/list_folder',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    }
  };

  const req = https.request(options, function (res) {
    const chunks = [];

    res.on('data', function (chunk) {
      chunks.push(chunk);
    });

    res.on('end', function () {
      console.log("1 check folder exist");
      if (res.statusCode == 200) {
        folderExist = true;
      }
      callback(null, folderExist)
    });
  });
  req.write(JSON.stringify({
    include_deleted: false,
    include_has_explicit_shared_members: false,
    include_media_info: false,
    include_mounted_folders: true,
    include_non_downloadable_files: true,
    path: '/Homework',
    recursive: false
  }));

  req.end()

}

function createFolder(token, folderExist, callback) {
  if (folderExist === true) {
    console.log("2 folder already exist")
    callback(null, null);
    return;
  }
  const options = {
    hostname: 'api.dropbox.com',
    path: '/2/files/create_folder_v2',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    }
  };

  const req = https.request(options, function (res) {
    const chunks = [];

    res.on('data', function (chunk) {
      chunks.push(chunk);
    });

    res.on('end', function () {
      console.log("2 creating folder in dropbox")
      callback(null, true)
    });
  });
  req.write(JSON.stringify({
    autorename: false,
    path: '/Homework'
  }));

  req.end();
}

let dogImageUrl = '';

function getRandomDog(callback) {
  const options = {
    hostname: 'random.dog',
    path: '/woof.json',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = https.request(options, function (res) {
    const chunks = [];

    res.on('data', function (chunk) {
      chunks.push(chunk);
    });

    res.on('end', function () {
      const body = Buffer.concat(chunks);
      dogImageUrl = JSON.parse(body).url;
      console.log('3 get random.dog API');
      callback(null, dogImageUrl)
    });
  });

  req.write(JSON.stringify({}));

  req.end();
}

function uploadFile(token, dogImageUrl) {
  const options = {
    hostname: 'api.dropboxapi.com',
    path: '/2/files/save_url',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer '+ token,
      'Content-Type': 'application/json'
    }
  };

  const req = https.request(options, function (res) {
    const chunks = [];

    res.on('data', function (chunk) {
      chunks.push(chunk);
    });

    res.on('end', function () {
      const body = Buffer.concat(chunks);
      console.log('4 upload file to dropbox')
    });
  });

  const fileName = new URL(dogImageUrl).pathname
  console.log(fileName)

  req.write(JSON.stringify({
    'path': '/Homework' + fileName,
    'url': dogImageUrl
  }));
  req.end()
}