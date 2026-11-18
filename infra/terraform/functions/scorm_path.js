// CloudFront viewer-request function (cloudfront-js-2.0) for the training
// packages distribution (scorm_cdn.tf).
//
// /scorm/<32 hex upload id>/<path>  ->  /training-content/<id>/<path>
// Anything else, or a path that tries to climb out with "..", is 404, so
// no other key in the bucket can be asked for through CloudFront.
var SCORM = /^\/scorm\/([0-9a-f]{32})\/(.+)$/;

function handler(event) {
  var request = event.request;
  var m = request.uri.match(SCORM);
  if (!m || /(^|\/)(\.|%2e){2}(\/|$)/i.test(m[2])) {
    return { statusCode: 404, statusDescription: 'Not Found' };
  }
  request.uri = '/training-content/' + m[1] + '/' + m[2];
  return request;
}
