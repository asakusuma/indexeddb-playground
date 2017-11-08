import Store from './store';

const store = new Store();

function loop() {
  store.markVitalsUpdate();
  store.getLastVitalsUpdate().then((result) => {
    console.log(result);
    requestAnimationFrame(loop);
  });
}

for (let i = 0; i < 100; i++) {
  loop();
}