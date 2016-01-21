var jsonld = require('jsonld');
var fs = require('fs');

var context = {
  "@context": {
    "@vocab": "http://schema.org/",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "knows": {
      "@container": "@set"
    },
    "name": {
      "@container": "@set"
    },
    "alternateName": {
      "@container": "@set"
    },
    "description": {
      "@container": "@set"
    },
    "keywords": {
      "@container": "@set"
    },
    "additionalType": {
      "@container": "@set"
    },
    "sameAs": {
      "@container": "@set",
      "@type": "@id"
    },
    "tag": {
      "@container": "@set"
    },
    "serviceType": {
      "@container": "@set"
    },
    "availableChannel": {
      "@container": "@set"
    },
    "license": {
      "@container": "@set"
    },
    "countryChampionFor": {
      "@container": "@set"
    },
    "author": {
      "@container": "@set"
    },
    "authorOf": {
      "@container": "@set"
    },
    "member": {
      "@container": "@set"
    },
    "memberOf": {
      "@container": "@set"
    },
    "provider": {
      "@container": "@set"
    },
    "provides": {
      "@container": "@set"
    },
    "creator": {
      "@container": "@set"
    },
    "created": {
      "@container": "@set"
    },
    "agent": {
      "@container": "@set"
    },
    "agentIn": {
      "@container": "@set"
    },
    "mentions": {
      "@container": "@set"
    },
    "mentionedIn": {
      "@container": "@set"
    },
    "participant": {
      "@container": "@set"
    },
    "participantIn": {
      "@container": "@set"
    },
    "narrower": {
      "@container": "@set"
    },
    "hasTopConcept": {
      "@container": "@set"
    },
    "about": {
      "@container": "@set"
    },
    "audience": {
      "@container": "@set"
    },
    "affiliation": {
      "@container": "@set"
    },
    "result": {
      "@container": "@set"
    },
    "contactPoint": {
      "@container": "@set"
    },
    "organizer": {
      "@container": "@set"
    },
    "organizerFor": {
      "@container": "@set"
    },
    "performer": {
      "@container": "@set"
    },
    "performerIn": {
      "@container": "@set",
      "@embed": "@always"
    },
    "mainEntityOf": {
      "@container": "@set"
    },
    "funder": {
      "@container": "@set"
    },
    "funderOf": {
      "@container": "@set"
    },
    "image": {
      "@type": "@id"
    },
    "url": {
      "@type": "@id"
    },
    "lat": {
      "@type": "xsd:double"
    },
    "lon": {
      "@type": "xsd:double"
    }
  }
};

var frame = {
  "@context": context["@context"],
  "@type": "Action",
  "@embed": "@link"
}

fs.readFile('action.json', 'utf8', function (err,json) {

  if (err) {
    return console.log(err);
  }

  json = JSON.parse(json);
  json["@context"] = context["@context"];

  jsonld.toRDF(json, {format: 'application/nquads'}, function(err, nquads) {
    jsonld.fromRDF(nquads, {format: 'application/nquads'}, function(err, doc) {
      jsonld.frame(doc, frame, function(err, compacted) {
        var result = full(compacted['@graph'][0]);
        console.log(JSON.stringify(result, null, 2));
      });
    });
  });

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
      result[p] = link(doc[p]);
    }
    return result;
  } else {
    return doc;
  }
}

function link(doc) {
  var linkProperties = ["@id", "@type", "name", "@value", "@language"];
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

