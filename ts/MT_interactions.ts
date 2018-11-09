import { FSM } from "./FSM";
import * as transfo from "./transfo";

function multiTouch(element: HTMLElement): void {
    let pointerId_1: number, Pt1_coord_element: SVGPoint, Pt1_coord_parent: SVGPoint,
        pointerId_2: number, Pt2_coord_element: SVGPoint, Pt2_coord_parent: SVGPoint,
        originalMatrix: SVGMatrix,
        getRelevantDataFromEvent = (evt: TouchEvent): Touch => {
            for (let i = 0; i < evt.changedTouches.length; i++) {
                let touch = evt.changedTouches.item(i);

                if (touch.identifier === pointerId_1 || touch.identifier === pointerId_2) {
                    return touch;
                }
            }
            return null;
        };
    enum MT_STATES { Inactive, Translating, Rotozooming }
    let fsm = FSM.parse<MT_STATES>({
        initialState: MT_STATES.Inactive,
        states: [MT_STATES.Inactive, MT_STATES.Translating, MT_STATES.Rotozooming],
        transitions: [
            {
                from: MT_STATES.Inactive, to: MT_STATES.Translating,
                eventTargets: [element],
                eventName: ["touchstart"],
                useCapture: false,
                action: (evt: TouchEvent): boolean => {
                    console.log("translating - touchstart");

                    pointerId_1 = 0;

                    const touch = getRelevantDataFromEvent(evt); // Récupération du doigt

                    originalMatrix = transfo.getMatrixFromElement(element); // Récupération de la matrice de l'élément
                    Pt1_coord_parent = transfo.getPoint(touch.pageX, touch.pageY); // Récupération de la position du doigt
                    Pt1_coord_element = Pt1_coord_parent.matrixTransform(originalMatrix.inverse()); // Application de la formule

                    return true;
                }
            },
            {
                from: MT_STATES.Translating, to: MT_STATES.Translating,
                eventTargets: [document],
                eventName: ["touchmove"],
                useCapture: true,
                action: (evt: TouchEvent): boolean => {
                    console.log("translating - touchmouve");

                    evt.preventDefault();
                    evt.stopPropagation();

                    const touch = getRelevantDataFromEvent(evt); // Récupération du doigt

                    Pt1_coord_parent = transfo.getPoint(touch.pageX, touch.pageY); // Récupération de la nouvelle position du doigt
                    transfo.drag(element, originalMatrix, Pt1_coord_element, Pt1_coord_parent); // Application de la formule de translation

                    return true;
                }
            },
            {
                from: MT_STATES.Translating,
                to: MT_STATES.Inactive,
                eventTargets: [document],
                eventName: ["touchend"],
                useCapture: true,
                action: (evt: TouchEvent): boolean => {
                    console.log("translating - touchstop");

                    // Réinitialisation

                    pointerId_1 = -1;

                    Pt1_coord_parent = null;
                    Pt1_coord_element = null;

                    return true;
                }
            },
            {
                from: MT_STATES.Translating, to: MT_STATES.Rotozooming,
                eventTargets: [element],
                eventName: ["touchstart"],
                useCapture: false,
                action: (evt: TouchEvent): boolean => {
                    console.log("rotozooming - touchstart");

                    pointerId_2 = 1;

                    const touch = getRelevantDataFromEvent(evt); // Récupération du 2ème doigt

                    Pt2_coord_parent = transfo.getPoint(touch.pageX, touch.pageY); // Récupération de la matrice du 2ème doigt
                    Pt2_coord_element = Pt2_coord_parent.matrixTransform(originalMatrix.inverse()); // Application de la formule

                    return true;
                }
            },
            {
                from: MT_STATES.Rotozooming, to: MT_STATES.Rotozooming,
                eventTargets: [document],
                eventName: ["touchmove"],
                useCapture: true,
                action: (evt: TouchEvent): boolean => {
                    console.log("rotozooming - touchmove");

                    evt.preventDefault();
                    evt.stopPropagation();

                    for (let i = 0; i < evt.changedTouches.length; i++) { // On boucle sur tous les doigts
                        let touch = evt.changedTouches.item(i); // On récupére le doigt

                        if (touch.identifier === pointerId_1) { // 1er doigt
                            Pt1_coord_parent = transfo.getPoint(touch.clientX, touch.clientY);
                        }
                        if (touch.identifier === pointerId_2) { // 2ème doigt
                            Pt2_coord_parent = transfo.getPoint(touch.clientX, touch.clientY);
                        }
                    }

                    transfo.rotozoom(element, originalMatrix, Pt1_coord_element, Pt1_coord_parent, Pt2_coord_element, Pt2_coord_parent); // Application de la formule de rotozooming

                    return true;
                }
            },
            {
                from: MT_STATES.Rotozooming,
                to: MT_STATES.Translating,
                eventTargets: [document],
                eventName: ["touchend"],
                useCapture: true,
                action: (evt: TouchEvent): boolean => {
                    console.log("rotozooming - touchstop");

                    const touch = getRelevantDataFromEvent(evt); // Récupération du doigt qui est enlevé

                    originalMatrix = transfo.getMatrixFromElement(element);

                    if (touch.identifier === pointerId_1) { // Echange des pointeurs si c'est le 1er doigt est enlevé
                        pointerId_1 = pointerId_2;
                        Pt1_coord_parent = Pt2_coord_parent;
                        Pt1_coord_element = Pt2_coord_element;

                        pointerId_2 = -1;
                        Pt2_coord_parent = null;
                        Pt2_coord_element = null;
                    } else {
                        pointerId_2 = -1;
                        Pt2_coord_parent = null;
                        Pt2_coord_element = null;
                    }

                    return true;
                }
            }
        ]
    });
    fsm.start();
}

//______________________________________________________________________________________________________________________
//______________________________________________________________________________________________________________________
//______________________________________________________________________________________________________________________
function isString(s: any): boolean {
    return typeof (s) === "string" || s instanceof String;
}

export let $ = (sel: string | Element | Element[]): void => {
    let L: Element[] = [];
    if (isString(sel)) {
        L = Array.from(document.querySelectorAll(<string>sel));
    } else if (sel instanceof Element) {
        L.push(sel);
    } else if (sel instanceof Array) {
        L = sel;
    }
    L.forEach(multiTouch);
};
