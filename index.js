'use strict'

const { ipcRenderer } = require('electron')
const connection = require('ssb-client')
const pull = require('pull-stream')
const choo = require('choo')
const h = require('hyperscript')
const { div, ul, body, li, input, button, section, h4 } =
  require('hyperscript-helpers')(h)

// choo app

const app = choo()
app.use(waitForConfig)
app.route('/', loadingScreen)
app.route('/test-network-1', appView)
app.route('/test-network-2', appView)
app.mount('body')

function waitForConfig(state, emitter) {
  window.onerror = function(error) {
    console.log('IPCError', error)
  }
  ipcRenderer.on('ssb-configs', (event, configs) => {
    const appIds = configs.map(c => c.appName)
    prepareStateAndListeners(state, emitter, appIds)
    state.servers = {}
    state.messages = {}
    state.peers = {}
    configs.forEach(config => {
      connection(config.keys, config, (err, server) => {
        if (err) return console.log(err)
        state.servers[config.appName] = server
        setInterval(function () {
          server.gossip.peers((err, peers) => {
            if (err) {
              console.log(err)
              return
            }
            state.peers[config.appName] = peers
            emitter.emit('render')
          })
        }, 8000) // peers als live-stream

        pull(
          server.createFeedStream({live: true}),
          pull.drain(msg => {
            if (!msg.value) return
            state.messages[config.appName] = state.messages[config.appName] || []
            state.messages[config.appName].unshift(msg)
            emitter.emit('replaceState', '/test-network-1')
          })
        )
        console.log('Success! Connected.')
      })
    })
  })
}

function loadingScreen () {
  return body('')
}

function prepareStateAndListeners(state, emitter, appIds) {
  state.activeApp = appIds[0]
  state.servers = {}
  state.messages = {}
  state.peers = {}
  appIds.reduce((acc, curr) => {
    acc[curr] = []
    return acc
  }, state.messages)
  appIds.reduce((acc, curr) => {
    acc[curr] = []
    return acc
  }, state.peers)

  emitter.on('DOMContentLoaded', () => {
    document.getElementById('publish').addEventListener('click', () => {
      state.activeServer.publish({
        type: 'hello-world'
      }, err => console.log(err))
    })

    document.getElementById('add-to-list').addEventListener('click', () => {
      const textField = document.getElementById('post')
      state.activeServer.publish({
        type: 'post',
        text: textField.value
      }, err => console.log(err))
      textField.value = ''
    })

    document.getElementById('switch-app').addEventListener('click', () => {
      const otherAppId = appIds.find(id => id !== state.activeApp)
      state.activeApp = otherAppId
      state.activeServer = state.servers[state.activeApp]
      emitter.emit('render')
    })
  })
}

const appIds = ['test-network-1', 'test-network-2']
function appView(state) {
  // later we'll need some kind of loading screen
  const currentApp = state.activeApp || 'test-network-1'
  const colors = ['lightyellow', 'lightblue']
  const appIndex = appIds.indexOf(currentApp)
  console.log(state.peers)
  const bg = `background-color:${colors[appIndex]}`
  return body({style: bg},
    div('.MainWindow',
      div('.SplitView',
        div('.side',
          div('.switch-app',
            button('#switch-app', 'Switch to other app')
          ),
          div('.show-peers',
            h4('Online peers:'),
            ul(state.peers[currentApp] && state.peers[currentApp].map(peer => li(peer.key)))
          )
        ),
        div('.main',
          div('.post-msg',
            input({type: "text", id: "post", name: "your message"}),
            button({ id: 'add-to-list' }, 'Post message')
          ),
          div('.say-hello',
            button({id: 'publish'}, 'say "hello world"')
          ),
          div('.feed',
            section('.content',
              state.messages[currentApp] && state.messages[currentApp].map(msg => {
                const m = msg.value
                let author = m.author.slice(1, 4)
                if (m.content.type === 'post') {
                  return div('.FeedEvent',`${author} says: ${m.content.text}`)
                } else if (m.content.type === 'hello-world') {
                  return div('.FeedEvent', `${author} says: ${m.content.type}`)
                }
              })
            )
          )
        )
      )
    )
  )
}
