import * as Y from 'yjs'
import getCaretCoordinates from 'textarea-caret'
import * as awarenessProtocol from 'y-protocols/awareness.js'

const events = [
    'keypress',
    'mouseup',
    'touchstart',
    'input',
    'paste',
    'cut',
    'selectend'
];


export class TextAreaCursors {
    
    private static areaIDCounter = 0;

    private _cursors : Map<number,HTMLDivElement> = new Map<number, HTMLDivElement>();
    private _areaID : string;

    constructor(
        awareness : awarenessProtocol.Awareness,
        yText : Y.Text,
        textFeild : HTMLTextAreaElement | HTMLInputElement) {

            this._areaID = (TextAreaCursors.areaIDCounter++).toString();

            if(textFeild.selectionStart === null || textFeild.selectionEnd === null){
                throw new Error("Sunsupported Input type");
            }

            const doc = yText.doc;
            if(doc === null){
                throw new Error("Missing doc on yText");
            }

            awareness.on('update', ()=>{

                console.log("Received"); 
                const fontSize = getComputedStyle(textFeild).getPropertyValue('font-size');
                const changes = awareness.getStates();
                for(const [clientID, change] of changes.entries()){
                    if(clientID === awareness.clientID) continue; // dont show local cursor

                    if(!this._cursors.has(clientID)){
                        const div = document.createElement('div')
                        div.style.position = 'absolute'
                        div.style.backgroundColor = 'rgba(255, 0, 0, 0.4)'
                        div.style.height = fontSize
                        div.style.width = '1px'
                        document.body.appendChild(div)
                        this._cursors.set(clientID, div)
                    }

                    const user = change[this._areaID]
                    if(user === undefined) continue

                    const encodedStart = user["start"] as any
                    const encodedEnd = user["end"] as any
                    const cursorMakrer = this._cursors.get(clientID) as HTMLDivElement;

                    const removeCursor = (clientID : number)=>{
                        const marker = this._cursors.get(clientID);
                        if(marker !== undefined){
                            document.body.removeChild(cursorMakrer)
                            this._cursors.delete(clientID);
                        }
                    }
                    if(encodedStart === undefined || encodedEnd === undefined){
                        removeCursor(clientID);
                        continue;
                    };

                    
                    const start = Y.createAbsolutePositionFromRelativePosition(JSON.parse(encodedStart), doc)
                    const end = Y.createAbsolutePositionFromRelativePosition(JSON.parse(encodedEnd), doc)

                    if(start === null || end === null){
                        removeCursor(clientID);
                        continue;
                    }

                    //console.log(`Received start,end ${start.index}, ${end.index}`);
                    const startCoordinates = getCaretCoordinates(textFeild, start.index);

                    cursorMakrer.style.top = textFeild.offsetTop
                        - textFeild.scrollTop
                        + startCoordinates.top
                        + 'px';
                    
                    cursorMakrer.style.left = textFeild.offsetLeft
                        - textFeild.scrollLeft
                        + startCoordinates.left
                        + 'px';

                    
                    if(start.index !== end.index){
                        let endCoordinates = getCaretCoordinates(textFeild, end.index);
                        cursorMakrer.style.width = endCoordinates.left - startCoordinates.left + 'px'; 
                    } else{
                        cursorMakrer.style.width = '1px'; 
                    }
                }
            });

            for(const event of events){
                textFeild.addEventListener(event, ()=>{
                    
                    const start = textFeild.selectionStart as number;
                    const end = textFeild.selectionEnd as number;

                    //console.log(`sent (start, end) ${start}, ${end}`);

                    const startRel = Y.createRelativePositionFromTypeIndex(yText, start);
                    const endRel = Y.createRelativePositionFromTypeIndex(yText, end);

                    awareness.setLocalStateField(this._areaID, {
                        user: awareness.clientID,
                        start: JSON.stringify(startRel),
                        end : JSON.stringify(endRel)
                    });
                });

                textFeild.addEventListener('focusout', ()=>{
                    awareness.setLocalStateField(this._areaID, {});
                });
            }
    }
}