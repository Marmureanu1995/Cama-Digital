import { Overlay } from '@angular/cdk/overlay';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireStorage } from '@angular/fire/storage';
import { NbDialogRef, NbToastrService } from '@nebular/theme';
import { TranslateService } from '@ngx-translate/core';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'pending-changes',
  templateUrl: './pending-changes.component.html',
  styleUrls: ['./pending-changes.component.scss']
})
export class PendingChangesComponent implements OnInit {

  constructor(private storage: AngularFireStorage, private afAuth: AngularFireAuth,
    public ref: NbDialogRef<PendingChangesComponent>, private httpclient: HttpClient, 
    public toastrService: NbToastrService, private firebaseservice: FirebaseService,
     private afs: AngularFirestore,public overlay: Overlay,public translate: TranslateService) { }

  ngOnInit() {
    
  }

}
