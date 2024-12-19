import { random_in_range } from "./random"

export function random_element<T>(array: Array<T>): T {
    return array[random_in_range(0, array.length)]
}

export function random_element_set<T>(array: Array<T>, size: number): Array<T> {
    const indices: number[] = []
    array.forEach((_, index) => indices.push(index))

    const selected_indices: number[] = []
    for (let loop_index = 0; loop_index < size; loop_index++) {
        if (indices.length === 0) break
        selected_indices.push(random_element(indices.filter((index) => !selected_indices.includes(index))))
    }

    return selected_indices.map((index) => array[index])
}