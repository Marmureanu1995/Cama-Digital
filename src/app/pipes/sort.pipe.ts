import {Pipe, PipeTransform} from '@angular/core';

@Pipe({name: "sortBy"})
export class SortPipe implements PipeTransform {

    transform(array: Array<any>, args: any): Array<any> {
        if (array !== undefined) {
            let keys, order;
            if(typeof args == 'string'){ // use default sort criteria
                keys = [args];
                order = 1;
            }

            if(keys.length > 0){
                array.sort((a: any, b: any) => {
                    if (a[keys[0]] < b[keys[0]]) {
                        return -1 * order;
                    } else if (a[keys[0]] > b[keys[0]]) {
                        return 1 * order;
                    } else {
                        return 0;
                    }
                });
            }
        }
        return array;
    }
}