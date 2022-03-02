import * as Y from 'yjs'
import getCaretCoordinates from 'textarea-caret'
import * as awarenessProtocol from 'y-protocols/awareness.js'

const events = [
    'keyup',
    'mouseup',
    'touchstart',
    'input',
    'paste',
    'cut',
    'selectend'
];

class Cursor{

    private _div : HTMLDivElement;

    constructor(fontSize : string){
        this._div = document.createElement('div')
        this._div.style.position = 'absolute'
        this._div.style.backgroundColor = 'rgba(255, 0, 0, 0.4)'
        this._div.style.height = fontSize
        this._div.style.width = '1px'
        this._div.style.display = 'none';
        document.body.appendChild(this._div);
    }

    show() {
        this._div.style.display = 'block';
    }

    hide() {
        this._div.style.display = 'none';
    }

    setPosition(top : number, left : number){
        this._div.style.top = top + 'px';
        this._div.style.left = left + 'px';
    }

    setWidth(width: number){
        this._div.style.width = width+'px';
    }
}


export class TextAreaCursors {
    
    private static areaIDCounter = 0;

    private _cursors : Map<number,Cursor> = new Map<number, Cursor>();
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
                const fontSize = getComputedStyle(textFeild).getPropertyValue('font-size');
                const changes = awareness.getStates();
                for(const [clientID, change] of changes.entries()){
                    if(clientID === awareness.clientID) continue; // dont show local cursor

                    if(!this._cursors.has(clientID)){
                        this._cursors.set(clientID, new Cursor(fontSize));
                    }

                    const user = change[this._areaID]
                    const cursorMarker = this._cursors.get(clientID);

                    if(user === undefined) continue;

                    const encodedStart = user["start"] as any
                    const encodedEnd = user["end"] as any
                    const selection = user["selection"] as boolean
                    
                    if(!selection){
                        cursorMarker?.hide();
                        continue;
                    }

                    if(encodedStart === undefined || encodedEnd === undefined) continue;

                    
                    const start = Y.createAbsolutePositionFromRelativePosition(JSON.parse(encodedStart), doc)
                    const end = Y.createAbsolutePositionFromRelativePosition(JSON.parse(encodedEnd), doc)

                    if(start === null || end === null){
                        cursorMarker?.hide();
                        continue;
                    }

                    const startCoordinates = getCaretCoordinates(textFeild, start.index);

                    const divBottom = startCoordinates.top + parseInt(fontSize);
                    if(startCoordinates.left > textFeild.clientWidth || divBottom > textFeild.clientHeight) {
                        cursorMarker?.hide();
                        continue;
                    } 

                    cursorMarker?.setPosition(
                        textFeild.offsetTop
                        - textFeild.scrollTop
                        + startCoordinates.top,

                        textFeild.offsetLeft
                        - textFeild.scrollLeft
                        + startCoordinates.left
                    );

                    
                    if(start.index !== end.index) {
                        let endCoordinates = getCaretCoordinates(textFeild, end.index);
                        let selectionWidth = endCoordinates.left - startCoordinates.left;
                        let avialableSpace = textFeild.clientWidth - startCoordinates.left;
                        cursorMarker?.setWidth(Math.min(selectionWidth, avialableSpace));
                    } else{
                        cursorMarker?.setWidth(1); 
                    }

                    cursorMarker?.show();
                }
            });

            for(const event of events){
                textFeild.addEventListener(event, ()=>{
                    
                    const start = textFeild.selectionStart as number;
                    const end = textFeild.selectionEnd as number;

                    const startRel = Y.createRelativePositionFromTypeIndex(yText, start);
                    const endRel = Y.createRelativePositionFromTypeIndex(yText, end);

                    awareness.setLocalStateField(this._areaID, {
                        user: awareness.clientID,
                        selection : true,
                        start: JSON.stringify(startRel),
                        end : JSON.stringify(endRel)
                    });
                });

                textFeild.addEventListener('focusout', ()=>{
                    awareness.setLocalStateField(this._areaID, {
                        user: awareness.clientID,
                        selection : false
                    });
                });
            }
    }
}