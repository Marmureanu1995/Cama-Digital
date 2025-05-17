import {Pipe, PipeTransform} from '@angular/core';

@Pipe({name: "changeFormat"})
export class ChangeFormatPipe implements PipeTransform {

    transform(date:string): string {
        return date.substring(5).replace('-','/')
    }
}