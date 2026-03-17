export function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {

        const jIndex = Math.floor(Math.random() * (i + 1));

        const temp = array[i];
        array[i] = array[jIndex];
        array[jIndex] = temp;

    }

    return array;
}

export function mafiaCount(playerCount) {
    return Math.max(1, Math.floor(playerCount / 5));
}

