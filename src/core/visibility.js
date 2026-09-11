/* Quando la scheda va in secondo piano il browser congela il ciclo di
   animazione. Senza questa pausa esplicita, al ritorno il tempo trascorso
   verrebbe scalato tutto in un colpo solo e la partita finirebbe da sola. */

export function onHidden({ pause, resume }) {
  let wasRunning = false;
  const handler = () => {
    if (document.hidden) {
      wasRunning = pause() === true;
    } else if (wasRunning) {
      wasRunning = false;
      resume();
    }
  };
  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
}
