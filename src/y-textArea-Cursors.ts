import getCaretCoordinates from 'textarea-caret'
import * as awarenessProtocol from 'y-protocols/awareness.js'

const events = [
    'keypress',
    'mousedown',
    'touchstart',
    'input',
    'paste',
    'cut',
    'mousemove',
    'select',
    'selectstart'
];


export class TextAreaCursors {
    
    private static areaIDCounter = 0;

    private _cursors : Map<number,HTMLDivElement> = new Map<number, HTMLDivElement>();
    private _areaID : string;

    constructor(
        awareness : awarenessProtocol.Awareness, 
        textFeild : HTMLTextAreaElement | HTMLInputElement) {

            this._areaID = (TextAreaCursors.areaIDCounter++).toString();

            if(textFeild.selectionStart === null || textFeild.selectionEnd === null){
                throw new Error("Sunsupported Input type");
            }

            awareness.on('change', ()=>{

                const fontSize = getComputedStyle(textFeild).getPropertyValue('font-size');
                const changes = awareness.getStates();
                for(const [clientID, change] of changes.entries()){
                    if(clientID === awareness.clientID) continue; // dont show out local cursor

                    if(!this._cursors.has(clientID)){
                        const div = document.createElement('div');
                        div.style.position = 'absolute';
                        div.style.backgroundColor = 'rgba(255, 0, 0, 0.4)';
                        div.style.height = fontSize;
                        div.style.width = '1px';
                        document.body.appendChild(div);
                        this._cursors.set(clientID, div);
                    }

                    const user = change[this._areaID];
                    if(user === undefined) continue;

                    const start = user["start"] as number;
                    const end = user["end"] as number
                    const cursorMakrer = this._cursors.get(clientID) as HTMLDivElement;

                    if(start === undefined || end === undefined){
                        document.body.removeChild(cursorMakrer)
                        this._cursors.delete(clientID);
                    };

                    const startCoordinates = getCaretCoordinates(textFeild, start);

                    cursorMakrer.style.top = textFeild.offsetTop
                        - textFeild.scrollTop
                        + startCoordinates.top
                        + 'px';
                    
                    cursorMakrer.style.left = textFeild.offsetLeft
                        - textFeild.scrollLeft
                        + startCoordinates.left
                        + 'px';

                    
                    if(start !== end){
                        let endCoordinates = getCaretCoordinates(textFeild, end);
                        cursorMakrer.style.width = endCoordinates.left - startCoordinates.left + 'px'; 
                    } else{
                        cursorMakrer.style.width = '1px'; 
                    }
                    
                    

                }
            });

            for(const event of events){
                textFeild.addEventListener(event, ()=>{
                    awareness.setLocalStateField(this._areaID, {
                        user: awareness.clientID,
                        start: textFeild.selectionStart,
                        end : textFeild.selectionEnd
                    })
                });

                textFeild.addEventListener('focusout', ()=>{
                    awareness.setLocalStateField(this._areaID, {});
                });
            }
    }
}