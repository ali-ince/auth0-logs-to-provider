const async = require('async');
const Request = require('request');

const config = require('../config');
const logger = require('../logger');

module.exports = () => {
  const ddMaxBatch = 200

  const ddBaseUrl = config('DATADOG_URL');
  const ddApiKey = config('DATADOG_API_KEY')
  const ddLogTags = config('DATADOG_LOG_TAGS') || ''
  const ddLogService = config('DATADOG_LOG_SERVICE') || ''
  const ddLogSource = config('DATADOG_LOG_SOURCE') || ''
  const ddUrl = `${ddBaseUrl}/${ddApiKey}`

  const concurrentCalls = parseInt(config('DATADOG_CONCURRENT_CALLS'), 10) || 5;
  const batchMode = config('SEND_AS_BATCH') === true || config('SEND_AS_BATCH') === 'true';

  const enrichItem = (item) => {
    if (ddLogService) {
      item.service = ddLogService
    }
    if (ddLogSource) {
      item.ddsource = ddLogSource
    }
    if (ddLogTags) {
      item.ddtags = ddLogTags
    }
  }

  const sendRequest = (data, callback) => {
    logger.debug(`sending data to '${ddUrl}'`);
    logger.debug(`data is '${JSON.stringify(data)}'`);

    Request({
      method: 'POST',
      url: ddUrl,
      json: true,
      body: data
    }, (err, response, body) => {
      logger.debug(`result => statusCode: ${response.statusCode}, err: ${err}, body: ${body}`);

      if (err || response.statusCode < 200 || response.statusCode >= 400) {
        return callback(err || body || response.statusCode);
      }

      return callback();
    });
  };

  const chunk = (arr, chunkSize) => {
    const chunks = [];
    for (var i = 0, len = arr.length; i < len; i += chunkSize)
      chunks.push(arr.slice(i, i + chunkSize));
    return chunks;
  };

  return (logs, callback) => {
    if (!logs || !logs.length) {
      return callback();
    }

    logger.info(`${logs.length} logs found.`);

    logger.debug(`enriching items with datadog entries.`);
    logs.forEach(enrichItem);
    logger.debug(`enrich complete => ${logs}`);

    let items = logs;
    if (batchMode) {
      items = chunk(logs, ddMaxBatch);
    }

    logger.info(`Sending ${items.length} items to '${ddBaseUrl}' using ${concurrentCalls} concurrent calls.`);
    return async.eachLimit(items, concurrentCalls, sendRequest, callback);
  };
};
