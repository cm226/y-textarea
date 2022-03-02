
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import {TextAreaBinding} from '../src/y-textArea'
import {TextAreaCursors} from '../src/y-textArea-Cursors'
import './style.css'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <h1>Y-Text Area Demo</h1>
  <textarea id="textArea"></textarea>
  <input type="text" id="textInput"></input>
`


const doc = new Y.Doc()
const wsProvider = new WebsocketProvider(`ws://${window.location.hostname}:1234`, 'my-roomname', doc)

wsProvider.on('status', (event:any) => {
  console.log(event.status) // logs "connected" or "disconnected"
});

const textArea = document.querySelector<HTMLTextAreaElement>('#textArea');
if(!textArea) throw new Error("missing Text area?");

const yTextArea = doc.getText("textArea");
//@ts-ignore
const areaBinding = new TextAreaBinding(yTextArea, textArea);

const textInput = document.querySelector<HTMLInputElement>('#textInput');
if(!textInput) throw new Error("missing Text area?");

const yTextInput = doc.getText("textInput");
//@ts-ignore
const inputBinding = new TextAreaBinding(yTextInput, textInput);

const areaCursors = new TextAreaCursors(wsProvider.awareness, yTextArea, textArea, {clientName:"Jaws"});
const inputCursors = new TextAreaCursors(wsProvider.awareness, yTextInput, textInput, { color : {r:255, g:0, b:0}, clientName:"bawz"});

