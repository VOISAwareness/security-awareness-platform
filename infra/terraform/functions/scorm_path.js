// CloudFront viewer-request function (cloudfront-js-2.0) for the training
// packages distribution (scorm_cdn.tf).
//
// /scorm/<32 hex upload id>/<path>  ->  /training-content/<id>/<path>
// /media/<32 hex upload id>/<name>   ->  /public-media/<id>/<name>
//   (pictures in emails and browser pages; one flat, safe file name)
// Anything else, or a path that tries to climb out with "..", is 404, so
// no other key in the bucket can be asked for through CloudFront.
var SCORM = /^\/scorm\/([0-9a-f]{32})\/(.+)$/;
var MEDIA = /^\/media\/([0-9a-f]{32})\/([A-Za-z0-9._-]{1,120})$/;

function handler(event) {
  var request = event.request;
  var media = request.uri.match(MEDIA);
  if (media && !/^\.+$/.test(media[2])) {
    request.uri = '/public-media/' + media[1] + '/' + media[2];
    return request;
  }
  var m = request.uri.match(SCORM);
  if (!m || /(^|\/)(\.|%2e){2}(\/|$)/i.test(m[2])) {
    return { statusCode: 404, statusDescription: 'Not Found' };
  }
  request.uri = '/training-content/' + m[1] + '/' + m[2];
  return request;
}
