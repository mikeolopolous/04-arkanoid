// Sonidos: originales precargados; nunca se reproducen directamente
const SOUNDS = {
  bounce: new Audio('assets/sounds/ball-bounce.mp3'),
  break: new Audio('assets/sounds/break-sound.mp3'),
};

// Reproduce un clon para que sonidos iguales se solapen; los fallos de play() se ignoran
export function playSound(name) {
  SOUNDS[name]
    .cloneNode()
    .play()
    .catch(() => {});
}
