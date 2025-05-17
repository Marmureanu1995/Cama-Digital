import { Injectable } from '@angular/core';

var callBit:boolean;

@Injectable({
  providedIn: 'root'
})
export class HeaderService {

  constructor() { }

  set setcallBit(v){
    callBit=v;
  }

  get getcallBit(){
    return callBit;
  }
}
