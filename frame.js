var express = require('express');
var jsonld = require('jsonld');
var fs = require('fs');

const PORT = 8080;
var context = JSON.parse(fs.readFileSync('context.json', 'utf8'));
var json = JSON.parse(fs.readFileSync('action.json', 'utf8'));
json["@context"] = context["@context"];

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

app.post('/:type', function(req, res) {
  console.log(req.rawBody);
  jsonld.fromRDF(req.rawBody, {format: 'application/nquads', useNativeTypes: true}, function(err, doc) {
    if (err) {
      console.error(err.stack);
      return res.status(500).send(err.stack);
    }
    var frame = {
      "@context": context["@context"],
      "@type": req.params.type,
      "@embed": "@link"
    };
    jsonld.frame(doc, frame, function(err, compacted) {
      if (err) {
        console.error(err.stack);
        return res.status(500).send(err.stack);
      }
      var result = JSON.stringify(full(compacted['@graph'][0]), null, 2);
      return res.send(result);
    });
  });
});

app.listen(PORT, function () {
  console.log('Listening on port %s', PORT);
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

