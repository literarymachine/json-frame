var express = require('express');
var jsonld = require('jsonld');
var fs = require('fs');

const PORT = process.argv[2] || 8080;
var context = JSON.parse(fs.readFileSync(__dirname + '/context.json', 'utf8'));

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

app.set('json spaces', 2);

app.post('/:type/:id', function(req, res) {
  var frame = {
    "@context": context["@context"],
    "@type": req.params.type,
    "@embed": "@link"
  };
  var doc = JSON.parse(req.rawBody);
  jsonld.frame(doc, frame, function(err, compacted) {
    if (err) {
      console.error(err.stack);
      return res.status(500).json(err);
    }
    for (var i = 0; i < compacted['@graph'].length; i++) {
      if (compacted['@graph'][i]['@id'] == req.params.id) {
        console.log("Framed", req.params.id);
        return res.json(full(compacted['@graph'][i]));
      }
    }
    return res.json({});
  });
});

app.post('/flatten/', function(req, res) {

  var doc = JSON.parse(req.rawBody);
  jsonld.flatten(doc, function(err, flattened) {
    if (err) {
      console.error(err.stack);
      return res.status(500).json(err);
    }
    var resources = [];
    for (var i = 0; i < flattened.length; i++) {
      jsonld.compact(flattened[i], context, function(err, compacted) {
        compacted['@context'] = "http://schema.org/"
        resources.push(compacted);
      });
    }
    var interval = setInterval(function() {
      if (resources.length == flattened.length) {
        clearInterval(interval);
        return res.json(cbds(resources));
      }
    }, 10);
  });

});

app.listen(PORT, function () {
  console.log('Listening on port %s', PORT);
});

function cbds(docs) {

  var resources = [];
  var bnodes = {};

  for (var i = 0; i < docs.length; i++) {
    if (/^_:/.test(docs[i]["@id"])) {
      var id = docs[i]["@id"];
      delete(docs[i]["@id"]);
      delete(docs[i]["@context"]);
      bnodes[id] = docs[i];
    } else {
      resources.push(docs[i]);
    }
  }

  for (var i = 0; i < resources.length; i++) {
    resources[i] = cbd(resources[i], bnodes);
  }
  return resources;

}

function cbd(doc, bnodes) {

  for (var p in doc) {
    if (doc[p] instanceof Array) {
      var result = [];
      for (var i = 0; i < doc[p].length; i++) {
        if (doc[p][i] instanceof Object && /^_:/.test(doc[p][i]["@id"])) {
          result.push(cbd(bnodes[doc[p][i]["@id"]], bnodes));
        } else if (doc[p][i] instanceof Object) {
          result.push(cbd(doc[p][i], bnodes));
        } else {
          result.push(doc[p][i]);
        }
      }
      doc[p] = result;
    } else if (doc[p] instanceof Object && /^_:/.test(doc[p]["@id"])) {
      doc[p] = cbd(bnodes[doc[p]["@id"]], bnodes);
    }
  }

  return doc;

}

function full(doc) {
  var result = {
    "@context": "http://schema.org/"
  };
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
