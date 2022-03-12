
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import {TextAreaBinding} from '../src/y-textArea'
import './style.css'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <h1>Y-Text Area Demo</h1>
  <textarea id="textArea"></textarea>
  <input type="text" id="textInput"></input>
  <button id="destroyBttn">Destroy</button>
`


const doc = new Y.Doc()
const wsProvider = new WebsocketProvider(`ws://${window.location.hostname}:1234`, 'my-roomname', doc)

wsProvider.on('status', (event:any) => {
  console.log(event.status) // logs "connected" or "disconnected"
});

const textArea = document.querySelector<HTMLTextAreaElement>('#textArea');
if(!textArea) throw new Error("missing Text area?");

const yText = doc.getText("textArea");

const rand = Math.floor(Math.random()*3);
const names = ["Tiger", "Penguin", "Cat"];
const color = [{r:47, g:226, b:147}, {r:18, g:214, b:70}, {r:87, g:96, b:202}];

//@ts-ignore
const areaBinding = new TextAreaBinding(
  yText,
  textArea,
  {
    awareness : wsProvider.awareness,
    clientName:names[rand],
    color : color[rand]
  }
  );

const textInput = document.querySelector<HTMLInputElement>('#textInput');
if(!textInput) throw new Error("missing Text area?");

const yTextInput = doc.getText("textInput");
//@ts-ignore
const inputBinding = new TextAreaBinding(yTextInput, textInput,{
  awareness : wsProvider.awareness,
  clientName:"wonder"
});

const destroyBttn = document.querySelector<HTMLInputElement>('#destroyBttn');
if(destroyBttn !== null){
  destroyBttn.onclick = ()=>{
    areaBinding.destroy();
  };
}
