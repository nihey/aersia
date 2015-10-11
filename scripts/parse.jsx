let xml;

// Use the DOM Parser to parse the XML
if (window.DOMParser !== undefined) {
  xml = string => new window.DOMParser().parseFromString(string, 'text/xml');
} else if (window.ActiveXObject !== undefined && new window.ActiveXObject("Microsoft.XMLDOM")) {
  // IE
  xml = function(string) {
    var doc = new window.ActiveXObject("Microsoft.XMLDOM");
    doc.async = "false";
    doc.loadXML(xmlStr);
    return doc;
  };
}

let getContent = function(element, tagName) {
  let tag = element.getElementsByTagName(tagName)[0];
  return tag && tag.innerHTML;
};

export default function(string) {
  let tracks = xml(string).getElementsByTagName('track');
  return Array.prototype.slice.call(tracks).map(function(track) {
    return {
      title: getContent(track, 'title'),
      creator: getContent(track, 'creator'),
      location: getContent(track, 'location'),
    }
  }).sort(function(a, b) {
    a = a.creator + a.title;
    b = b.creator + b.title;
    return a.localeCompare(b);
  });
}
