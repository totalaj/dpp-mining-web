import { random_in_range } from "./random";

export function random_element<T>(array: Array<T>) : T {
    return array[random_in_range(0, array.length)]
}