import Dispatcher, { REWIND_ACTION } from './dispatcher'

export { isGossipType, REWIND_ACTION } from './dispatcher'

// Applies default options.
const defaultOptions = {
  uri: 'http://localhost:3000',
  primus: (typeof window === 'object' && window.Primus),
}

// Store enhancer
// Wraps createStore to inject our history reducer, wraps dispatch to send and
// receive actions from peers, and FIXME: getState to apparently break everything
//
export default function scuttlebutt(options) {
  options = { ...defaultOptions, ...options }

  return (createStore) => {
    // is it more efficient to store previous states, or replay a bunch of
    // previous actions? (until we have COMMIT checkpointing, the former)
    const gossip = connectGossip(new Dispatcher(), options.uri, options.primus)

    return (reducer, preloadedState, enhancer) => {
      const store = createStore(
        gossip.wrapReducer(reducer),
        [[,,preloadedState]], // preloaded state is the earliest snapshot
        enhancer)

      return {
        ...store,
        dispatch: gossip.wrapDispatch(store.dispatch),
        getState: gossip.wrapGetState(store.getState),
      }
    }
  }
}

// initialise network io
function connectGossip(scuttlebutt, uri) {
  const io = Primus.connect(uri)

  console.log('[io] connecting...')

  connectStreams(io, scuttlebutt.createStream())

  return scuttlebutt
}

// the internet is a series of tubes
function connectStreams(io, gossip) {
  // would love to do this. it doesn't work:
  // spark.pipe(docStream).pipe(spark)
  let DEBUG_DELAY
  if (/^#\d+/.test(window.location.hash)) {
    DEBUG_DELAY = parseInt(window.location.hash.substr(1))
    console.debug('delayed connection active', DEBUG_DELAY)
  }

  io.on('data', function message(data) {
    // console.log('[io] <-', data)
    if (DEBUG_DELAY) {
      return setTimeout(() => gossip.write(data), DEBUG_DELAY)
    }
    gossip.write(data)
  })

  gossip.on('data', (data) => {
    // console.log('[io] ->', data)
    if (DEBUG_DELAY) {
      return setTimeout(() => io.write(data), DEBUG_DELAY)
    }
    io.write(data)
  })

  // network events

  io.on('open', () => {
    console.log('[io] connection open')
  })

  io.on('error', (error) => {
    console.log('[io] error', error)
  })

  // store stream events

  gossip.on('error', (error) => {
    console.warn('[gossip] error', error)
  })

  // handshake header recieved from a new peer. includes their id and clock info
  gossip.on('header', (header) => {
    const { id, clock } = header
    console.log('[gossip] header', id)
  })
}
