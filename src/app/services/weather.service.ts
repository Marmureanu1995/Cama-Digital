import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import {AngularFirestore} from "@angular/fire/firestore";
// @ts-ignore
import firebase from 'firebase/app';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  constructor(private http: HttpClient, private afs: AngularFirestore) {

  }

  getLocation(location: string) {
    const postsRef = this.afs.collection('count').doc('weatherCount');
    postsRef.update({
      weatherCount: firebase.firestore.FieldValue.increment(1)
    });
    return this.http.get<any>("https://api.weatherstack.com/autocomplete?access_key=3cb35003ebe53b4c4f54ea5f86409a79&query=" + location);
  }
  getWeatherForcast(location: string, forecast_days) {
    return this.http.get<any>("https://api.weatherstack.com/forecast?access_key=3cb35003ebe53b4c4f54ea5f86409a79&query=" + location + "&forecast_days=" + forecast_days);
  }
}
