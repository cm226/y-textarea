import * as Y from 'yjs'
import getCaretCoordinates from 'textarea-caret'
import intersection from 'rectangle-overlap'
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

export interface color{
    r : number;
    g : number;
    b : number;
}

export interface options{
    clientName? : string,
    color? : color
}

class Cursor{

    private _div : HTMLDivElement;
    private _nameDiv? : HTMLDivElement;

    private _color : color;
    private _fontSize : string;
    private _selectedIndex : {start:number, end:number};

    private _visible : boolean;

    constructor(fontSize : string, cssColor : color, name? : string) {
        this._visible = false;
        this._selectedIndex = {start:0, end:0};
        this._fontSize = fontSize;
        this._color = cssColor;
        this._div = document.createElement('div')
        this._div.style.position = 'absolute'
        this._div.style.backgroundColor = `rgba(${cssColor.r}, ${cssColor.g}, ${cssColor.b}, 0.4)`
        this._div.style.height = fontSize
        this._div.style.width = '1px'
        this._div.style.display = 'none';
        this._div.style.borderRadius = '2px';
        document.body.appendChild(this._div);

        if(name !== undefined){
            this._nameDiv = document.createElement('div')
            this._nameDiv.style.position = 'absolute';
            this._nameDiv.style.padding = '3px';
            this._nameDiv.style.borderRadius = '3px';
            this._nameDiv.style.display = 'none';
            this._nameDiv.style.backgroundColor = `rgba(${cssColor.r}, ${cssColor.g}, ${cssColor.b}, 1.0)`
            this._nameDiv.innerHTML = name;
            document.body.appendChild(this._nameDiv);
        }
    }

    show() {
        this._visible = true;
        this._div.style.display = 'block';
        if(this._nameDiv)
            this._nameDiv.style.display = 'block';
    }

    hide() {
        this._visible = false;
        this._div.style.display = 'none';
        if(this._nameDiv)
            this._nameDiv.style.display = 'none';
    }

    setPosition(start : number, end: number) {
        this._selectedIndex = {start,end};
    }

    setWidth(width: number){
        this._div.style.width = width+'px';
        if(width===1){
            this._div.style.backgroundColor = `rgba(${this._color.r}, ${this._color.g}, ${this._color.b}, 1.0)`
        } else{
            this._div.style.backgroundColor = `rgba(${this._color.r}, ${this._color.g}, ${this._color.b}, 0.4)`
        }
    }

    rePosition(textFeild : HTMLTextAreaElement | HTMLInputElement) {

        const startCoordinates = getCaretCoordinates(textFeild, this._selectedIndex.start);

        const screenSpaceTop = textFeild.offsetTop
        - textFeild.scrollTop
        + startCoordinates.top as number;

        const screenSpaceLeft = textFeild.offsetLeft
        - textFeild.scrollLeft
        + startCoordinates.left as number;

        let width = 1;
        if(this._selectedIndex.start !== this._selectedIndex.end) {
            let endCoordinates = getCaretCoordinates(textFeild, this._selectedIndex.end);
            width = endCoordinates.left - startCoordinates.left;
        }

        const areaScreenSpace = {
            x : textFeild.offsetLeft,
            y : textFeild.offsetTop,
            width : textFeild.clientWidth,
            height : textFeild.clientHeight
        };

        const cursorScreenSpace = {
            x : screenSpaceLeft,
            y : screenSpaceTop,
            width : width,
            height : parseInt(this._fontSize)
        }

        // Check if the selected is out of view
        const overlap = intersection(areaScreenSpace, cursorScreenSpace);
        if(!overlap) {
            this.hide();
            return;
        } 

        this._div.style.top = overlap.y + 'px';
        this._div.style.left = overlap.x + 'px';

        if(this._nameDiv){
            const height = getComputedStyle(this._nameDiv).getPropertyValue('height');
            this._nameDiv.style.top = overlap.y + parseInt(height) +'px';
            this._nameDiv.style.left = overlap.x + 'px';
        }
        

        this.setWidth(overlap.width); 

        this.show();
    }

    destroy(){
        document.body.removeChild(this._div);
        if(this._nameDiv)
            document.body.removeChild(this._nameDiv);
    }
}


export class TextAreaCursors {
    
    private static areaIDCounter = 0;

    private _cursors : Map<number,Cursor> = new Map<number, Cursor>();
    private _areaID : string;
    private _textField : HTMLTextAreaElement | HTMLInputElement;

    constructor(
        awareness : awarenessProtocol.Awareness,
        yText : Y.Text,
        textField : HTMLTextAreaElement | HTMLInputElement, 
        options : options) {

            this._areaID = (TextAreaCursors.areaIDCounter++).toString();
            this._textField = textField;

            if(textField.selectionStart === null || textField.selectionEnd === null){
                throw new Error("unSupported Input type");
            }

            const doc = yText.doc;
            if(doc === null){
                throw new Error("Missing doc on yText");
            }

            awareness.on('update', (event : {removed: number[]}, transaction)=>{


                if(event.removed.length != 0){
                    for(const id of event.removed){
                        if(this._cursors.has(id)){
                            const cursor = this._cursors.get(id);
                            cursor?.destroy();
                            this._cursors.delete(id);
                        }
                    }
                }

                const fontSize = getComputedStyle(textField).getPropertyValue('font-size');
                const changes = awareness.getStates();
                for(const [clientID, change] of changes.entries()){
                    if(clientID === awareness.clientID) continue; // dont show local cursor

                    if(!this._cursors.has(clientID)) { 
                        this._cursors.set(clientID, new Cursor(
                            fontSize,
                            options.color || {r:45, g:80, b:237},
                            options.clientName
                        ));
                    }

                    const user = change[this._areaID]
                    const cursorMarker = this._cursors.get(clientID);

                    if(user === undefined) continue;

                    const encodedStart = user["start"] as any
                    const encodedEnd = user["end"] as any
                    const selection = user["selection"] as boolean
                    
                    if(!selection) {
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

                    cursorMarker?.setPosition(start.index, end.index);
                    cursorMarker?.rePosition(textField);
                }
            });

            for(const event of events){
                textField.addEventListener(event, ()=>{
                    
                    const start = textField.selectionStart as number;
                    const end = textField.selectionEnd as number;

                    const startRel = Y.createRelativePositionFromTypeIndex(yText, start);
                    const endRel = Y.createRelativePositionFromTypeIndex(yText, end);

                    awareness.setLocalStateField(this._areaID, {
                        user: awareness.clientID,
                        selection : true,
                        start: JSON.stringify(startRel),
                        end : JSON.stringify(endRel)
                    });
                });

                textField.addEventListener('focusout', ()=>{
                    awareness.setLocalStateField(this._areaID, {
                        user: awareness.clientID,
                        selection : false
                    });
                });

                textField.addEventListener('scroll', ()=>{this.rePositionCursors();});
            }
    }

    public rePositionCursors() {
        for(const [_index, cursor] of this._cursors){
            cursor.rePosition(this._textField);
        }
    }
}