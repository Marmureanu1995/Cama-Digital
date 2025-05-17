import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
  HttpErrorResponse,
  HttpHandler,
  HttpEvent
} from '@angular/common/http';

import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class HttpResponseInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // add a custom header
    var customReq: any;
    if (request.url.includes('English')) {
      customReq = request.clone({
        headers: request.headers.set('Content-Type','text/html').set('Access-Control-Allow-Origin', '*')
      });
    }
    else if(request.url.includes('api.weatherstack.co')){
      customReq = request.clone();
    }
    else{
      customReq = request.clone({
        headers: request.headers.set('Content-Type','application/json').set('Access-Control-Allow-Origin', '*')
      });
    }


    // pass on the modified request object
    return next.handle(customReq).pipe(
      tap((ev: HttpEvent<any>) => {
        if (ev instanceof HttpResponse) {
        }
      }),
      catchError(response => {
        if (response instanceof HttpErrorResponse) {
        }
        return throwError(response);
      })
    );
  }
}
