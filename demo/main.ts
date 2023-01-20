import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { TextAreaBinding } from '../src/y-textArea'
import './style.css'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <h1>Y-Text Area Demo</h1>
  <textarea id="textArea"></textarea>
  <input type="text" id="textInput"></input>
  <button id="destroyBttn">Destroy</button>
  <button id="newName">New Name</button>
`

const doc = new Y.Doc()
const wsProvider = new WebsocketProvider(
  `ws://${window.location.hostname}:1234`,
  'my-roomname',
  doc
)

wsProvider.on('status', (event: any) => {
  console.log(event.status) // logs "connected" or "disconnected"
})

const textArea = document.querySelector<HTMLTextAreaElement>('#textArea')
if (!textArea) throw new Error('missing Text area?')

const yText = doc.getText('textArea')

const rand = Math.floor(Math.random() * 3)
const names = ['Tiger', 'Penguin', 'Cat']
const color = [
  { r: 0, g: 0, b: 255 },
  { r: 0, g: 255, b: 0 },
  { r: 255, g: 0, b: 0 },
]

//@ts-ignore
let areaBinding = new TextAreaBinding(yText, textArea, {
  awareness: wsProvider.awareness,
  clientName: names[rand],
  color: color[rand],
})

const textInput = document.querySelector<HTMLInputElement>('#textInput')
if (!textInput) throw new Error('missing Text area?')

const yTextInput = doc.getText('textInput')
//@ts-ignore
const inputBinding = new TextAreaBinding(yTextInput, textInput, {
  awareness: wsProvider.awareness,
  clientName: 'wonder',
})

const destroyBttn = document.querySelector<HTMLInputElement>('#destroyBttn')
if (destroyBttn !== null) {
  destroyBttn.onclick = () => {
    areaBinding.destroy()
  }
}

const newNameBttn = document.querySelector<HTMLInputElement>('#newName')
if (newNameBttn !== null) {
  newNameBttn.onclick = () => {
    areaBinding.destroy()
    areaBinding = new TextAreaBinding(yText, textArea, {
      awareness: wsProvider.awareness,
      clientName: names[Math.floor(Math.random() * 3)],
      color: color[Math.floor(Math.random() * 3)],
    })
  }
}
