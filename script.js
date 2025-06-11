import { parse } from 'https://cdn.skypack.dev/intel-hex';
import {
  CPU,
  AVRIOPort,
  portDConfig,
  timer0Config,
  AVRTimer,
  PinState,
  avrInstruction
} from 'https://cdn.skypack.dev/avr8js';

/*
 * TODO:
 *       - remove 'Compile & Run' button
 *       - just reload when click start simulation
 *       - see a better usage for led css class
*/

class ArduinoSimulator {
  constructor() {
    this.cpu = null;
    this.port = null;
    this.timer = null;
    this.isRunning = false;
    this.animationId = null;
    this.cycleCount = 0;
    this.startCount = 0;
    this.lastUpdateTime = 0;
    this.targetFrequency = 16000000;
    this.cyclesPerFrame = 80000;

    this.elements = {
      led: document.getElementById('led'),
      status: document.getElementById('status'),
      cycles: document.getElementById('cycles'),
      frequency: document.getElementById('frequency'),
      uptime: document.getElementById('uptime'),
      code: document.getElementById('code'),
    };
  }

  updateStatus(message, type='stopped') {
    this.elements.status.textContent = message;
    this.elements.status.className = `status ${type}`;
  }

  updateStats() {
    const now = performance.now()

    if (now  - this.lastUpdateTime > 100) {
      const uptime = this.startTime ? (now - this.startTime) / 1000 : 0;
      const frequency = uptime > 0 ? Math.round(this.cycleCount / uptime) : 0;

      this.elements.cycles.textContent = this.cycleCount.toLocaleString();
      this.elements.frequency.textContent = frequency.toLocaleString();
      this.elements.uptime.textContent = uptime.toFixed(1) + 's';

      this.lastUpdateTime = now;
    }
  }

  async compileCode(code) {
    this.updateStatus('Compiling...', 'compiling');

    try {
      const response = await fetch('https://hexi.wokwi.com/build', {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sketch: code }),
      });

      if (!response.ok) {
        throw new Error('Compilation failed:', response.statusText);
      }

      const { hex, stderr } = await response.json();

      if (!hex) {
        throw new Error(stderr || 'Compilation failed');
      }

      return hex;
    } catch (error) {
      this.updateStatus(`Error: ${error.message}`,   'stopped');
      throw error;
    }
  }

  initializeHardware(hex) {
    const { data } = parse(hex);
    const progData = new Uint8Array(data);

    this.cpu = new CPU(new Uint16Array(progData.buffer));

    this.port = new AVRIOPort(this.cpu, portDConfig);
    this.port.addListener(() => {
      const isHigh = this.port.pinState(7) === PinState.High;
      this.elements.led.value = isHigh;
    });

    this.timer = new AVRTimer(this.cpu, timer0Config)

    this.cycleCount = 0;
    this.startTime = performance.now();
    this.lastUpdateTime = this.startTime;
  }

  simulationLoop() {
    if (!this.isRunning || !this.cpu) return;

    const startTime = performance.now();

    for (let cycles = 0; cycles < this.cyclesPerFrame
      && performance.now() - startTime < 16; cycles++, this.cycleCount++) {
      avrInstruction(this.cpu);
      this.cpu.tick();
    }

    this.updateStats();

    this.animationId = requestAnimationFrame(() => this.simulationLoop());
  }

  async start(code) {
    if (this.isRunning) return;

    try {
      const hex = await this.compileCode(code);
      this.initializeHardware(hex);

      this.isRunning = true;
      this.updateStatus('Running simulation...', 'running');
      this.simulationLoop();
    } catch (error) {
      console.error('Failed to start simulation:',  error);
    }
  }

  stop() {
    this.isRunning = false;

    if (this.animationId){
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.updateStatus('Simulation stopped',  'stopped');
  }

  reset() {
    this.stop();
    this.cycleCount = 0;
    this.elements.cycles.textContent = '0';
    this.elements.frequency.textContent = '0';
    this.elements.uptime.textContent = '0s';
    this.updateStatus('Ready to compile', 'stopped');
  }
}

window.simulator = new ArduinoSimulator();

window.startSimulation = () => {
  const code = document.getElementById('code').value;
  window.simulator.start(code);
};

window.stopSimulation = () => {
  window.simulator.stop();
};

window.resetSimulation = () => {
  window.simulator.reset();
};

window.compileAndRun = () => {
  window.simulator.reset();
  setTimeout(() => window.startSimulation(), 100);
};

