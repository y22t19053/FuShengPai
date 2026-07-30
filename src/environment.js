// ===== src/environment.js · 环境音量感知 =====
let audioContext = null;
let analyser = null;
let dataArray = null;
let noiseCounter = 0;
const NOISE_THRESHOLD = 30; // 音量阈值
const NOISE_CONSECUTIVE = 3; // 连续触发次数

export async function initEnvironmentMonitor() {
  // 检查是否已有提醒 DOM
  let warningEl = document.getElementById('envNoiseWarning');
  if (!warningEl) {
    warningEl = document.createElement('div');
    warningEl.id = 'envNoiseWarning';
    warningEl.textContent = '🌬️ 环境声量较大，建议静心';
    document.body.appendChild(warningEl);
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    dataArray = new Uint8Array(analyser.fftSize);
    
    // 开始监听
    monitorVolume();
  } catch (err) {
    // 用户拒绝麦克风权限，静默降级
    console.log('环境音量感知未启用（麦克风权限被拒）');
  }
}

function monitorVolume() {
  if (!analyser || !dataArray) return;
  analyser.getByteFrequencyData(dataArray);
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
  const avg = sum / dataArray.length;
  
  const warningEl = document.getElementById('envNoiseWarning');
  if (avg > NOISE_THRESHOLD) {
    noiseCounter++;
    if (noiseCounter >= NOISE_CONSECUTIVE) {
      warningEl.classList.add('visible');
    }
  } else {
    noiseCounter = 0;
    warningEl.classList.remove('visible');
  }
  
  requestAnimationFrame(monitorVolume);
}