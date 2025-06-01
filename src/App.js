import React from 'react';
import './App.css';
import '@wokwi/elements';
import { parse } from 'intel-hex';
import { Buffer } from 'buffer';
import {
  CPU,
  avrInstruction,
  AVRIOPort,
  portDConfig,
  PinState,
  AVRTimer,
  timer0Config
} from 'avr8js';

window.Buffer = Buffer;

const arduinoCode = `
void setup() {
  // put your setup code here, to run once:
  pinMode(7, OUTPUT);
}

void loop() {
  // put your main code here, to run repeatedly:
  digitalWrite(7, HIGH);
  delay(1000);
  digitalWrite(7, LOW);
  delay(1000);
}
`;

export default function App() {
  const [ledState, setLedState] = React.useState(false);

  const runCode = async () => {
    // Compile the arduino source code
    console.log('sending request...');
    const result = await fetch('https://hexi.wokwi.com/build', {
      method: 'post',
      body: JSON.stringify({ sketch: arduinoCode }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const { hex, stderr } = await result.json();
    if (!hex) {
      alert(stderr);
      return;
    }
    const { data } = parse(hex);
    const progData = new Uint8Array(data);
    console.log(data);
    // Set up the simulation
    const cpu = new CPU(new Uint16Array(progData.buffer));
    // Attach the virtual hardware
    const port = new AVRIOPort(cpu, portDConfig);
    port.addListener(() => {
      const turnOn = port.pinState(7) === PinState.High;
      setLedState(turnOn);
      console.log('LED', turnOn);
    });
    new AVRTimer(cpu, timer0Config);
    // Run the simulation
    while (true) {
      for (let i = 0; i < 500000; i++) {
        avrInstruction(cpu);
        cpu.tick();
      }
      await new Promise(resolve => setTimeout(resolve));
    }
  };

  return (
    <div className="App">
      <h1>Arduino Simulator</h1>
      <wokwi-led color="red" value={ledState ? true : ''} />
      <button onClick={runCode}>Run</button>
      <textarea
        value={arduinoCode}
        readOnly
        style={{ width: '100%' }}
        rows="20"
      />
    </div>
  );
}

