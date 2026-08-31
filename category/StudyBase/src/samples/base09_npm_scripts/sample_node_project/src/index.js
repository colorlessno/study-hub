const modeArg = process.argv.find((arg) => arg.startsWith('--mode='));
const mode = modeArg ? modeArg.split('=')[1] : 'start';

function message(currentMode) {
  return `npm script practice: ${currentMode}`;
}

if (require.main === module) {
  console.log(message(mode));
}

module.exports = { message };
