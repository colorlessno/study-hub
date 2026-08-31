export function log(entry) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...entry }))
}
