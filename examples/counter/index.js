import React from 'react'
import ReactDOM from 'react-dom'
import { createStore, compose, applyMiddleware } from 'redux'
import Counter from './components/Counter'
import App from './components/App'
import counter from './reducers'
import distributed from 'redux-scuttlebutt'

const store = createStore(counter, {},
  applyMiddleware(distributed()),
  window.devToolsExtension && window.devToolsExtension()
)

const rootEl = document.getElementById('root')

function render() {
  ReactDOM.render(
    <App store={ store } />,
    rootEl
  )
}

render()
store.subscribe(render)