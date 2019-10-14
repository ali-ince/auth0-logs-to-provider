const async = require('async');
const Request = require('request');

const config = require('../config');
const logger = require('../logger');

module.exports = () => {
  const ddMaxBatch = 200

  const ddUrl = config('DATADOG_URL');
  const ddApiKey = config('DATADOG_API_KEY')
  const ddLogTags = config('DATADOG_LOG_TAGS') || ''
  const ddLogService = config('DATADOG_LOG_SERVICE') || ''
  const ddLogSource = config('DATADOG_LOG_SOURCE') || ''
  const ddUrl = `${ddUrl}/${ddApiKey}?ddtags=${ddLogTags}&ddsource=${ddLogSource}&service=${ddLogService}`

  const ddConcurrentCalls = parseInt(config('DATADOG_CONCURRENT_CALLS'), 10) || 5;
  const batchMode = config('SEND_AS_BATCH') === true || config('SEND_AS_BATCH') === 'true';

  const sendRequest = (data, callback) =>
    Request({
      method: 'POST',
      url: ddUrl,
      json: true,
      body: data
    }, (err, response, body) => {
      if (err || response.statusCode < 200 || response.statusCode >= 400) {
        return callback(err || body || response.statusCode);
      }

      return callback();
    });

    const chunk = (arr, chunkSize) => {
      const chunks = [];
      for (var i=0,len=arr.length; i<len; i+=chunkSize)
        chunks.push(arr.slice(i,i+chunkSize));
      return chunks;
    };

  return (logs, callback) => {
    if (!logs || !logs.length) {
      return callback();
    }

    logger.info(`${logs.length} logs found.`);

    let items = logs;
    if (batchMode) {
      items = chunk(logs, ddMaxBatch);
    }

    logger.info(`Sending to '${ddUrl}' with ${concurrentCalls} concurrent calls.`);
    return async.eachLimit(items, concurrentCalls, sendRequest, callback);
  };
};
