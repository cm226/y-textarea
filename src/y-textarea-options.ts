import * as awarenessProtocol from 'y-protocols/awareness.js'

export interface color{
    r : number;
    g : number;
    b : number;
}

export interface options{
    awareness : awarenessProtocol.Awareness,
    clientName? : string,
    color? : color
}