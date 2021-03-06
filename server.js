'use strict'
const scuttleBot = require('scuttlebot')
const createSbot = scuttleBot
  .use(require('scuttlebot/plugins/master'))
  .use(require('scuttlebot/plugins/gossip'))
  .use(require('scuttlebot/plugins/local'))
  .use(require('scuttlebot/plugins/logging'))
  .use(require('scuttlebot/plugins/replicate'))
  .use(require('ssb-query'))
  .use(require('ssb-ws'))
  .use(require('ssb-friends'))

module.exports = function(ssbConfig) {
  return createSbot(Object.assign(ssbConfig, {
    logging: {
      level: 'notice'
    }
  }))
}
