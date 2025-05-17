import { Injectable } from '@angular/core';
import * as firebase from 'firebase/app';

@Injectable({
  providedIn: 'root'
})
export class FirebaseTimeService {

  constructor() { }


firebaseServerTime(){
  return firebase.firestore.FieldValue.serverTimestamp();
}
}
