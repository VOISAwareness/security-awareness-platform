// CloudFront viewer-request function (cloudfront-js-2.0) for the API path of
// the app's distribution (scorm_cdn.tf): /api/<route> -> /<route>, as the
// HTTP API knows it. The query string is left as it is.
function handler(event) {
  var request = event.request;
  request.uri = request.uri.replace(/^\/api(?=\/|$)/, '') || '/';
  return request;
}
