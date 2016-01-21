var express = require('express');
var jsonld = require('jsonld');
var fs = require('fs');

const PORT = 8080;
var context = JSON.parse(fs.readFileSync('context.json', 'utf8'));
var json = JSON.parse(fs.readFileSync('action.json', 'utf8'));
json["@context"] = context["@context"];

var frame = {
  "@context": context["@context"],
  "@type": "Action",
  "@embed": "@link"
};

var app = express();
app.use(function(req, res, next) {
  req.rawBody = '';
  req.setEncoding('utf8');

  req.on('data', function(chunk) { 
    req.rawBody += chunk;
  });

  req.on('end', function() {
    next();
  });
});
//app.use(express.bodyParser());

app.get('/', function (req, res) {
  jsonld.toRDF(json, {format: 'application/nquads'}, function(err, nquads) {
    console.log(nquads);
    jsonld.fromRDF(nquads, {format: 'application/nquads'}, function(err, doc) {
      jsonld.frame(doc, frame, function(err, compacted) {
        var result = full(compacted['@graph'][0]);
        res.send(JSON.stringify(result, null, 2));
      });
    });
  });
});

app.post('/', function(req, res) {
  jsonld.fromRDF(req.rawBody, {format: 'application/nquads'}, function(err, doc) {
    jsonld.frame(doc, frame, function(err, compacted) {
      var result = full(compacted['@graph'][0]);
      res.send(JSON.stringify(result, null, 2));
    });
  });
});

app.listen(PORT, function () {
  console.log('Example app listening on port %s', PORT);
});

function full(doc) {
  var result = {};
  for (var p in doc) {
    result[p] = embed(doc[p]);
  }
  return result;
}

function embed(doc) {
  if (doc instanceof Array) {
    var result = [];
    for (var i in doc) {
      result.push(embed(doc[i]));
    }
    return result;
  } else if (doc instanceof Object) {
    var result = {};
    for (var p in doc) {
      if (! (p == "@id" && /^_:/.test(doc["@id"]))) {
        result[p] = link(doc[p]);
      }
    }
    return result;
  } else {
    return doc;
  }
}

function link(doc) {
  var linkProperties = ["@id", "@type", "@value", "@language", "name"];
  if (doc instanceof Array) {
    var result = [];
    for (var i in doc) {
      result.push(link(doc[i]));
    }
    return result;
  } else if (doc instanceof Object) {
    if (/^_:/.test(doc["@id"])) {
      return embed(doc);
    }
    var result = {};
    for (var p in doc) {
      if (linkProperties.indexOf(p) != -1) {
        result[p] = doc[p];
      }
    }
    return result;
  } else {
    return doc;
  }
}

