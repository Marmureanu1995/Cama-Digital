import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CommonserviceService {
  private clicked = new Subject<boolean>();
  private childres = new Subject<boolean>();
  private companyData = new Subject<any>();
  constructor() { }
  ClickedOtherItem(click: boolean){
    this.clicked.next(click);
  }

  responseClickedOtherItem(){
    return this.clicked.asObservable();
  }
  SendCompany(click: string){
    console.log(click)
    this.companyData.next(click);
  }

  getCompany(){
    return this.companyData.asObservable();
  }


}
